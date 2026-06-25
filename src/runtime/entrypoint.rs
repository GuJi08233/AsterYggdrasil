//! Product entrypoint assembly for the HTTP service.
//!
//! This module keeps the binary `main.rs` thin while preserving product-owned
//! wiring: configuration loading, Actix application construction, background
//! task spawning, and audit-aware shutdown ordering. Forge supplies the shared
//! process mechanics such as panic hooks, termination signal handling, and
//! shutdown report logging.

use std::io;

use actix_web::{App, HttpServer, middleware, web};
use tokio_util::sync::CancellationToken;

const HTTP_SHUTDOWN_TIMEOUT_SECS: u64 = 8;

/// Runs the AsterYggdrasil HTTP service until it receives a shutdown signal.
pub async fn run() -> io::Result<()> {
    install_panic_hook();
    dotenvy::dotenv().ok();

    let config = crate::config::init_config().map_err(to_io_error)?;
    crate::api::middleware::csrf::init_token_names_from_auth_config(&config.auth)
        .map_err(to_io_error)?;

    let logging = aster_forge_logging::init_logging(&config.logging);
    let _log_guard = logging.guard;
    if let Some(warning) = logging.warning {
        tracing::warn!("{warning}");
    }

    let prepared = crate::runtime::startup::prepare(config)
        .await
        .map_err(to_io_error)?;

    let host = prepared.state.config.server.host.clone();
    let port = prepared.state.config.server.port;
    let workers = worker_count(prepared.state.config.server.workers);

    tracing::info!(host = %host, port, workers, "starting AsterYggdrasil HTTP service");

    let shutdown_token = CancellationToken::new();
    let state = web::Data::new(prepared.state);
    let shutdown_db_handles = state.get_ref().db_handles.clone();
    let shutdown_data = web::Data::new(shutdown_token.clone());
    let metrics_data = web::Data::new(state.get_ref().metrics.clone());
    let background_tasks = crate::runtime::tasks::spawn_runtime_background_tasks(
        state.clone(),
        shutdown_token.clone(),
    );

    let server = build_server(
        host.as_str(),
        port,
        workers,
        state.clone(),
        shutdown_data,
        metrics_data,
    )?;
    let handle = server.handle();
    aster_forge_runtime::ServiceLifecycle::new(server, shutdown_token)
        .run(
            move || async move {
                handle.stop(true).await;
            },
            move || {
                let state = state.clone();
                async move {
                    crate::runtime::shutdown::record_server_shutdown(state.get_ref()).await;
                    crate::runtime::shutdown::perform_shutdown(
                        background_tasks,
                        shutdown_db_handles,
                    )
                    .await;
                }
            },
        )
        .await
}

fn install_panic_hook() {
    aster_forge_panic::install_panic_hook(aster_forge_panic::PanicHookConfig::new(
        "AsterYggdrasil",
        env!("CARGO_PKG_VERSION"),
        env!("CARGO_PKG_REPOSITORY"),
    ));
}

fn worker_count(configured_workers: usize) -> usize {
    if configured_workers == 0 {
        num_cpus::get()
    } else {
        configured_workers
    }
}

fn build_server(
    host: &str,
    port: u16,
    workers: usize,
    state: web::Data<crate::runtime::AppState>,
    shutdown_data: web::Data<CancellationToken>,
    metrics_data: web::Data<aster_forge_metrics::SharedMetricsRecorder>,
) -> io::Result<actix_web::dev::Server> {
    let server = HttpServer::new(move || {
        App::new()
            .wrap(middleware::Compress::default())
            .wrap(middleware::Logger::default())
            .wrap(aster_forge_actix_middleware::request_id::RequestIdMiddleware)
            .wrap(crate::api::middleware::cors::RuntimeCors)
            .wrap(aster_forge_actix_middleware::security_headers::default_headers())
            .wrap(aster_forge_actix_middleware::metrics::MetricsMiddleware)
            .app_data(state.clone())
            .app_data(shutdown_data.clone())
            .app_data(metrics_data.clone())
            .configure(crate::api::configure)
    })
    .workers(workers)
    .bind((host, port))?
    .shutdown_timeout(HTTP_SHUTDOWN_TIMEOUT_SECS)
    .disable_signals()
    .run();
    Ok(server)
}

fn to_io_error(error: impl ToString) -> io::Error {
    io::Error::other(error.to_string())
}

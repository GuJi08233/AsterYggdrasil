//! Runtime component assembly.
//!
//! This module turns prepared product state into the concrete Forge runtime.
//! It keeps the process entrypoint focused on bootstrap and execution while
//! centralizing the Yggdrasil-specific component graph.

use std::io;

use actix_web::web;
use tokio_util::sync::CancellationToken;

/// Assembles and runs the Forge runtime from prepared product state.
pub async fn run(prepared: crate::runtime::startup::PreparedRuntime) -> io::Result<()> {
    let host = prepared.state.config.server.host.clone();
    let port = prepared.state.config.server.port;
    let workers = worker_count(prepared.state.config.server.workers);

    tracing::info!(host = %host, port, workers, "starting AsterYggdrasil HTTP service");

    let shutdown_token = CancellationToken::new();
    let state = web::Data::new(prepared.state);
    let shutdown_data = web::Data::new(shutdown_token.clone());
    let metrics_data = web::Data::new(state.get_ref().metrics.clone());

    let http_component = crate::runtime::http::http_component(
        crate::runtime::http::HttpRuntimeConfig {
            host: host.as_str(),
            port,
            workers,
        },
        state.clone(),
        shutdown_data,
        metrics_data,
    )?;
    let product_components =
        crate::runtime::components::product_runtime_components(state, shutdown_token);

    aster_forge_runtime::AsterRuntime::builder()
        .component(http_component)
        .component(product_components)
        .run()
        .await
        .map_err(to_io_error)?
}

fn worker_count(configured_workers: usize) -> usize {
    if configured_workers == 0 {
        num_cpus::get()
    } else {
        configured_workers
    }
}

fn to_io_error(error: impl ToString) -> io::Error {
    io::Error::other(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::worker_count;

    #[test]
    fn worker_count_uses_cpu_count_when_configured_zero() {
        assert_eq!(worker_count(0), num_cpus::get());
    }

    #[test]
    fn worker_count_uses_explicit_value() {
        assert_eq!(worker_count(4), 4);
    }
}

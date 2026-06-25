//! Graceful shutdown helpers.

use crate::runtime::SharedRuntimeState;
use aster_forge_db::DbHandles;
use aster_forge_runtime::{RuntimeComponentKind, RuntimeComponentRegistry};
use aster_forge_tasks::BackgroundTasks;

pub async fn perform_shutdown(background_tasks: BackgroundTasks, db_handles: DbHandles) {
    let mut registry = RuntimeComponentRegistry::configured(|registry| {
        configure_runtime_components(registry, background_tasks, db_handles);
    });

    let report = registry.shutdown().await;
    aster_forge_runtime::log_shutdown_report(&report);
}

pub fn configure_runtime_components(
    registry: &mut RuntimeComponentRegistry,
    background_tasks: BackgroundTasks,
    db_handles: DbHandles,
) {
    registry
        .component("background_tasks")
        .kind(RuntimeComponentKind::Tasks)
        .shutdown_once(
            "background_tasks",
            None,
            background_tasks,
            |background_tasks| async move {
                background_tasks.shutdown().await;
                Ok(())
            },
        );

    registry
        .component("audit_logs")
        .kind(RuntimeComponentKind::Product)
        .shutdown("audit_logs", None, || async {
            crate::services::audit_service::shutdown_global_audit_log_manager().await;
            Ok(())
        });

    registry
        .component("database")
        .kind(RuntimeComponentKind::Database)
        .depends_on("background_tasks")
        .depends_on("audit_logs")
        .shutdown_once(
            "database_connections",
            None,
            db_handles,
            |db_handles| async move {
                db_handles
                    .close()
                    .await
                    .map_err(|error| error.to_string())?;
                Ok(())
            },
        );
}

pub async fn record_server_shutdown<S: SharedRuntimeState>(state: &S) {
    let backend = state.writer_db().get_database_backend();
    crate::services::audit_service::log(
        state,
        &crate::services::audit_service::AuditContext::system(),
        crate::types::AuditAction::ServerShutdown,
        crate::types::AuditEntityType::System,
        None,
        Some("server"),
        None,
    )
    .await;
    tracing::info!(?backend, "server shutdown recorded");
}

#[cfg(test)]
mod tests {
    use super::configure_runtime_components;
    use aster_forge_tasks::BackgroundTasks;

    #[tokio::test]
    async fn shutdown_components_configure_descriptors_and_dependencies() {
        let db = sea_orm::Database::connect("sqlite::memory:")
            .await
            .expect("shutdown test database should connect");
        let db_handles = aster_forge_db::DbHandles::single(db);
        let registry = aster_forge_runtime::RuntimeComponentRegistry::configured(|registry| {
            configure_runtime_components(registry, BackgroundTasks::new(), db_handles);
        });

        let descriptors = registry.descriptors();
        assert_eq!(descriptors.len(), 3);
        assert_eq!(descriptors[0].name, "background_tasks");
        assert_eq!(
            descriptors[0].kind,
            aster_forge_runtime::RuntimeComponentKind::Tasks
        );
        assert_eq!(descriptors[1].name, "audit_logs");
        assert_eq!(descriptors[2].name, "database");
        assert_eq!(
            descriptors[2].kind,
            aster_forge_runtime::RuntimeComponentKind::Database
        );
        assert_eq!(
            descriptors[2].dependencies,
            vec!["background_tasks", "audit_logs"]
        );
        assert_eq!(
            descriptors[2]
                .shutdown
                .expect("database shutdown should be registered")
                .phase_name,
            "database_connections"
        );
    }
}

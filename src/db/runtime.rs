//! Database runtime component registration.

use crate::errors::{AsterError, MapAsterErr, Result};
use crate::runtime::DatabaseRuntimeState;
use aster_forge_db::DbHandles;
use aster_forge_metrics::SharedMetricsRecorder;
use aster_forge_runtime::RuntimeComponentRegistry;

const DATABASE_SHUTDOWN_DEPENDENCIES: &[&str] = &[
    aster_forge_tasks::BACKGROUND_TASKS_COMPONENT,
    aster_forge_mail::MAIL_OUTBOX_COMPONENT,
    aster_forge_audit::AUDIT_MANAGER_COMPONENT,
];

/// Creates the database runtime component used by the product entrypoint.
pub fn database_component(
    db_handles: DbHandles,
) -> aster_forge_runtime::RuntimeComponentBundleRegistration<aster_forge_db::DatabaseRuntimeComponent>
{
    aster_forge_db::database_component_after(db_handles, DATABASE_SHUTDOWN_DEPENDENCIES)
}

/// Connects database handles and applies pending migrations.
pub async fn prepare_database_handles(
    config: &crate::config::DatabaseConfig,
    metrics: SharedMetricsRecorder,
) -> Result<DbHandles> {
    let writer = crate::db::connect_with_metrics(config, metrics.clone()).await?;
    migration::Migrator::up(&writer, None)
        .await
        .map_aster_err(AsterError::database_operation)?;
    crate::db::connect_reader_for_writer_with_metrics(config, writer, metrics).await
}

/// Registers database readiness and diagnostics health checks.
pub fn register_database_health_check<S>(registry: &mut RuntimeComponentRegistry, state: &S)
where
    S: DatabaseRuntimeState,
{
    aster_forge_db::register_database_health_check(registry, state.reader_db().clone());
}

#[cfg(test)]
mod tests {
    use super::{
        DATABASE_SHUTDOWN_DEPENDENCIES, database_component, prepare_database_handles,
        register_database_health_check,
    };
    use crate::config::DatabaseConfig;
    use crate::runtime::DatabaseRuntimeState;
    use aster_forge_runtime::RuntimeComponentBundle;
    use aster_forge_runtime::{HealthCheckScope, HealthStatus};
    use sea_orm::DatabaseConnection;

    struct DatabaseHealthState {
        db: DatabaseConnection,
    }

    impl DatabaseRuntimeState for DatabaseHealthState {
        fn writer_db(&self) -> &DatabaseConnection {
            &self.db
        }

        fn reader_db(&self) -> &DatabaseConnection {
            &self.db
        }
    }

    #[tokio::test]
    async fn database_component_registers_shutdown_dependency() {
        let db = sea_orm::Database::connect("sqlite::memory:")
            .await
            .expect("database runtime test database should connect");
        let db_handles = aster_forge_db::DbHandles::single(db);

        let registry = aster_forge_runtime::RuntimeComponentRegistry::configured(|registry| {
            database_component(db_handles).register(registry);
        });

        let descriptor = registry
            .descriptor(aster_forge_db::DATABASE_COMPONENT)
            .expect("database component should be registered");
        assert_eq!(
            descriptor.kind,
            aster_forge_runtime::RuntimeComponentKind::Database
        );
        assert_eq!(
            descriptor.dependencies,
            vec![
                aster_forge_tasks::BACKGROUND_TASKS_COMPONENT,
                aster_forge_mail::MAIL_OUTBOX_COMPONENT,
                aster_forge_audit::AUDIT_MANAGER_COMPONENT
            ]
        );
        assert_eq!(
            descriptor
                .shutdown
                .expect("database shutdown should be registered")
                .phase_name,
            aster_forge_db::DATABASE_CONNECTIONS_SHUTDOWN_PHASE
        );
    }

    #[tokio::test]
    async fn database_shutdown_registrar_can_be_used_directly() {
        let db = sea_orm::Database::connect("sqlite::memory:")
            .await
            .expect("database registrar test database should connect");
        let db_handles = aster_forge_db::DbHandles::single(db);

        let registry = aster_forge_runtime::RuntimeComponentRegistry::configured(|registry| {
            aster_forge_db::register_database_shutdown(
                registry,
                db_handles,
                DATABASE_SHUTDOWN_DEPENDENCIES,
            );
        });

        assert!(
            registry
                .descriptor(aster_forge_db::DATABASE_COMPONENT)
                .is_some()
        );
    }

    #[tokio::test]
    async fn prepare_database_handles_connects_and_migrates_database() {
        let config = DatabaseConfig {
            url: "sqlite::memory:".to_string(),
            pool_size: 1,
            retry_count: 0,
        };

        let db_handles = prepare_database_handles(&config, aster_forge_metrics::NoopMetrics::arc())
            .await
            .expect("database handles should prepare");

        assert!(db_handles.writer().ping().await.is_ok());
        assert!(db_handles.reader().ping().await.is_ok());
    }

    #[tokio::test]
    async fn database_component_reports_ping_success_and_failure() {
        let db = crate::db::connect_with_metrics(
            &DatabaseConfig {
                url: "sqlite::memory:".to_string(),
                pool_size: 1,
                retry_count: 0,
            },
            aster_forge_metrics::NoopMetrics::arc(),
        )
        .await
        .expect("database health test database should connect");

        let healthy = aster_forge_db::check_database_component(&db).await;
        assert_eq!(healthy.status, HealthStatus::Healthy);
        assert_eq!(healthy.message, "database ping succeeded");

        db.close_by_ref()
            .await
            .expect("database health test database should close");
        let unhealthy = aster_forge_db::check_database_component(&db).await;
        assert_eq!(unhealthy.status, HealthStatus::Unhealthy);
        assert!(unhealthy.message.contains("database ping failed"));
    }

    #[tokio::test]
    async fn database_health_check_registers_readiness_component() {
        let db = crate::db::connect_with_metrics(
            &DatabaseConfig {
                url: "sqlite::memory:".to_string(),
                pool_size: 1,
                retry_count: 0,
            },
            aster_forge_metrics::NoopMetrics::arc(),
        )
        .await
        .expect("database readiness test database should connect");
        let state = DatabaseHealthState { db };
        let mut registry = aster_forge_runtime::RuntimeComponentRegistry::new();

        register_database_health_check(&mut registry, &state);

        assert_eq!(registry.len(), 1);
        let report = registry.run_health(HealthCheckScope::Readiness).await;
        let component_names = report
            .components
            .iter()
            .map(|component| component.name)
            .collect::<Vec<_>>();
        assert_eq!(component_names, vec![aster_forge_db::DATABASE_COMPONENT]);
        assert_eq!(report.status(), HealthStatus::Healthy);
    }
}

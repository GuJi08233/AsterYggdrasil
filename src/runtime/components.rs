//! Product runtime component assembly.
//!
//! Each subsystem exposes its own Forge runtime component constructor from the
//! module that owns the corresponding resource. This module only captures
//! resources from `AppState` and returns the tuple bundle that the Forge runtime
//! already knows how to register. That keeps the product entrypoint thin
//! without adding another Yggdrasil-specific component registry layer.

use actix_web::web;
use tokio_util::sync::CancellationToken;

use crate::runtime::AppState;
use crate::services::audit_service::runtime::AuditRuntimeResources;
use crate::services::mail_outbox_service::runtime::MailOutboxRuntimeResources;

/// Builds the Yggdrasil product component bundle used by the process entrypoint.
///
/// Runtime background tasks are spawned here so the entrypoint can construct the
/// HTTP service first and only start asynchronous product workers after the
/// server has bound successfully.
pub fn product_runtime_components(
    state: web::Data<AppState>,
    shutdown_token: CancellationToken,
) -> aster_forge_runtime::RuntimeComponentBundleRegistration<
    impl aster_forge_runtime::RuntimeComponentBundle + Send + 'static,
> {
    let background_tasks =
        crate::tasks::runtime::spawn_runtime_background_tasks(state.clone(), shutdown_token);
    let state = state.get_ref();

    aster_forge_runtime::runtime_component((
        crate::tasks::runtime::task_component(background_tasks),
        crate::services::mail_outbox_service::runtime::mail_outbox_component(
            MailOutboxRuntimeResources::from_state(state),
        ),
        crate::services::audit_service::runtime::audit_component(
            AuditRuntimeResources::from_state(state),
        ),
        crate::db::runtime::database_component(state.db_handles.clone()),
    ))
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use aster_forge_runtime::RuntimeComponentBundle;

    #[tokio::test]
    async fn tuple_product_components_register_expected_graph() {
        let db = sea_orm::Database::connect("sqlite::memory:")
            .await
            .expect("component graph test database should connect");
        let db_handles = aster_forge_db::DbHandles::single(db);
        let mail_outbox_resources =
            crate::services::mail_outbox_service::runtime::MailOutboxRuntimeResources::new(
                db_handles.writer().clone(),
                Arc::new(crate::config::RuntimeConfig::new()),
                aster_forge_mail::memory_sender(),
            );
        let audit_resources = crate::services::audit_service::runtime::AuditRuntimeResources::new(
            db_handles.writer().clone(),
            Arc::new(crate::config::RuntimeConfig::new()),
        );

        let components = (
            crate::tasks::runtime::task_component(aster_forge_tasks::BackgroundTasks::new()),
            crate::services::mail_outbox_service::runtime::mail_outbox_component(
                mail_outbox_resources,
            ),
            crate::services::audit_service::runtime::audit_component(audit_resources),
            crate::db::runtime::database_component(db_handles),
        );
        let registry = aster_forge_runtime::RuntimeComponentRegistry::configured(|registry| {
            components.register(registry);
        });

        registry
            .validate()
            .expect("Yggdrasil runtime component graph should validate");
        let component_names = registry
            .descriptors()
            .iter()
            .map(|descriptor| descriptor.name)
            .collect::<Vec<_>>();
        assert_eq!(
            component_names,
            vec![
                aster_forge_tasks::BACKGROUND_TASKS_COMPONENT,
                aster_forge_mail::MAIL_OUTBOX_COMPONENT,
                aster_forge_audit::AUDIT_LOGS_COMPONENT,
                aster_forge_audit::AUDIT_MANAGER_COMPONENT,
                aster_forge_db::DATABASE_COMPONENT
            ]
        );
        assert_eq!(
            registry
                .descriptor(aster_forge_db::DATABASE_COMPONENT)
                .expect("database component should be registered")
                .dependencies,
            vec![
                aster_forge_tasks::BACKGROUND_TASKS_COMPONENT,
                aster_forge_mail::MAIL_OUTBOX_COMPONENT,
                aster_forge_audit::AUDIT_MANAGER_COMPONENT
            ]
        );
    }
}

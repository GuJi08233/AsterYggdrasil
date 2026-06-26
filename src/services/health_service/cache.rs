//! Cache health check registration.
//!
//! Forge owns the generic cache diagnostics check. Yggdrasil only chooses the
//! product runtime state fields used as the configured cache backend and active
//! cache instance.

use crate::runtime::{AppConfigRuntimeState, CacheRuntimeState};
use aster_forge_runtime::RuntimeComponentRegistry;

/// Registers cache diagnostics health checks.
pub fn register_cache_health_check<S>(registry: &mut RuntimeComponentRegistry, state: &S)
where
    S: AppConfigRuntimeState + CacheRuntimeState,
{
    aster_forge_cache::register_cache_health_check(
        registry,
        state.config().cache.clone(),
        state.cache().clone(),
    );
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::register_cache_health_check;
    use crate::config::Config;
    use crate::runtime::{AppConfigRuntimeState, CacheRuntimeState};

    struct CacheHealthState {
        config: Arc<Config>,
        cache: Arc<dyn aster_forge_cache::CacheBackend>,
    }

    impl AppConfigRuntimeState for CacheHealthState {
        fn config(&self) -> &Arc<Config> {
            &self.config
        }
    }

    impl CacheRuntimeState for CacheHealthState {
        fn cache(&self) -> &Arc<dyn aster_forge_cache::CacheBackend> {
            &self.cache
        }
    }

    #[tokio::test]
    async fn cache_health_check_registers_diagnostics_component() {
        let state = CacheHealthState {
            config: Arc::new(Config::default()),
            cache: Arc::new(aster_forge_cache::MemoryCache::new(60)),
        };
        let mut registry = aster_forge_runtime::RuntimeComponentRegistry::new();

        register_cache_health_check(&mut registry, &state);

        let descriptor = registry
            .descriptor(aster_forge_cache::CACHE_COMPONENT)
            .expect("cache component should be registered");
        assert_eq!(
            descriptor.kind,
            aster_forge_runtime::RuntimeComponentKind::Cache
        );
        assert_eq!(descriptor.health_checks.len(), 1);

        let report = registry
            .run_health(aster_forge_runtime::HealthCheckScope::Diagnostics)
            .await;
        assert_eq!(
            report.components[0].name,
            aster_forge_cache::CACHE_HEALTH_CHECK
        );
        assert_eq!(report.status(), aster_forge_runtime::HealthStatus::Healthy);
    }
}

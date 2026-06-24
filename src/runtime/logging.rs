//! Runtime logging initialization.
//!
//! Yggdrasil owns the deserialized application configuration schema, while
//! `aster_forge_logging` owns the shared tracing subscriber behavior used across
//! Aster services. This module is intentionally limited to mapping the local
//! [`LoggingConfig`] into the Forge runtime logging configuration.

use crate::config::LoggingConfig;

pub fn init_logging(config: &LoggingConfig) -> aster_forge_logging::LoggingInitResult {
    aster_forge_logging::init_logging(&forge_logging_config(config))
}

fn forge_logging_config(config: &LoggingConfig) -> aster_forge_logging::LoggingConfig {
    aster_forge_logging::LoggingConfig {
        level: config.level.clone(),
        format: config.format.clone(),
        file: config.file.clone(),
        enable_rotation: config.enable_rotation,
        max_backups: config.max_backups,
    }
}

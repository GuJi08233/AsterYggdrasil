//! Avatar runtime configuration.

use crate::config::RuntimeConfig;
use crate::errors::{AsterError, MapAsterErr, Result};
use std::path::{Path, PathBuf};

pub use crate::config::definitions::{AVATAR_DIR_KEY, GRAVATAR_BASE_URL_KEY};

pub const DEFAULT_AVATAR_DIR: &str = "avatar";
const DEFAULT_DATA_DIR: &str = "data";
const DEFAULT_GRAVATAR_BASE_URL: &str = "https://www.gravatar.com/avatar";
const MAX_AVATAR_DIR_LEN: usize = 4096;

pub fn normalize_avatar_dir_config_value(value: &str) -> Result<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Ok(DEFAULT_AVATAR_DIR.to_string());
    }
    if normalized.len() > MAX_AVATAR_DIR_LEN {
        return Err(AsterError::validation_error(format!(
            "avatar_dir exceeds {MAX_AVATAR_DIR_LEN} characters"
        )));
    }
    if normalized.chars().any(char::is_control) {
        return Err(AsterError::validation_error(
            "avatar_dir cannot contain control characters",
        ));
    }
    Ok(normalized.to_string())
}

pub fn normalize_gravatar_base_url_config_value(value: &str) -> Result<String> {
    crate::utils::url::normalize_http_base_url(
        value,
        "gravatar_base_url",
        true,
        true,
        AsterError::validation_error,
    )
    .map(|normalized| normalized.unwrap_or_else(|| DEFAULT_GRAVATAR_BASE_URL.to_string()))
}

pub fn avatar_dir_or_default(runtime_config: &RuntimeConfig) -> String {
    runtime_config
        .get_string_or(AVATAR_DIR_KEY, DEFAULT_AVATAR_DIR)
        .trim()
        .to_string()
}

pub fn gravatar_base_url_or_default(runtime_config: &RuntimeConfig) -> String {
    let normalized = runtime_config
        .get_string_or(GRAVATAR_BASE_URL_KEY, DEFAULT_GRAVATAR_BASE_URL)
        .trim()
        .trim_end_matches('/')
        .to_string();
    if normalized.is_empty() {
        DEFAULT_GRAVATAR_BASE_URL.to_string()
    } else {
        normalized
    }
}

pub fn resolve_local_avatar_root_dir(runtime_config: &RuntimeConfig) -> Result<PathBuf> {
    let configured = avatar_dir_or_default(runtime_config);
    let configured_path = Path::new(&configured);
    if configured_path.is_absolute() {
        return Ok(configured_path.to_path_buf());
    }

    std::env::current_dir()
        .map(|cwd| cwd.join(DEFAULT_DATA_DIR).join(configured_path))
        .map_aster_err(|error| {
            AsterError::internal_error(format!("resolve avatar_dir '{configured}': {error}"))
        })
}

#[cfg(test)]
mod tests {
    use super::{
        DEFAULT_AVATAR_DIR, avatar_dir_or_default, gravatar_base_url_or_default,
        normalize_avatar_dir_config_value, normalize_gravatar_base_url_config_value,
    };
    use crate::config::RuntimeConfig;
    use crate::entities::system_config;
    use crate::types::{SystemConfigSource, SystemConfigValueType, SystemConfigVisibility};
    use chrono::Utc;

    #[test]
    fn avatar_dir_normalization_trims_and_falls_back_to_default() {
        assert_eq!(
            normalize_avatar_dir_config_value("  ").unwrap(),
            DEFAULT_AVATAR_DIR
        );
        assert_eq!(
            normalize_avatar_dir_config_value("  /srv/avatars  ").unwrap(),
            "/srv/avatars"
        );
        assert!(normalize_avatar_dir_config_value("avatar\nnext").is_err());
    }

    #[test]
    fn avatar_dir_defaults_when_runtime_value_missing() {
        assert_eq!(
            avatar_dir_or_default(&RuntimeConfig::new()),
            DEFAULT_AVATAR_DIR
        );
    }

    #[test]
    fn gravatar_base_url_normalization_rejects_query_and_bad_scheme() {
        assert_eq!(
            normalize_gravatar_base_url_config_value(" https://mirror.example/avatar/ ").unwrap(),
            "https://mirror.example/avatar"
        );
        assert!(normalize_gravatar_base_url_config_value("ftp://example.com/avatar").is_err());
        assert!(
            normalize_gravatar_base_url_config_value("https://example.com/avatar?x=1").is_err()
        );
        assert!(
            normalize_gravatar_base_url_config_value("https://example.com/avatar#frag").is_err()
        );
    }

    #[test]
    fn gravatar_base_url_defaults_when_runtime_value_is_blank() {
        let runtime_config = RuntimeConfig::new();
        runtime_config.apply(system_config::Model {
            id: 1,
            key: super::GRAVATAR_BASE_URL_KEY.to_string(),
            value: "   ".to_string(),
            value_type: SystemConfigValueType::String,
            source: SystemConfigSource::System,
            visibility: SystemConfigVisibility::Private,
            requires_restart: false,
            is_sensitive: false,
            category: "auth".to_string(),
            namespace: "system".to_string(),
            description: String::new(),
            updated_at: Utc::now(),
            updated_by: None,
        });

        assert_eq!(
            gravatar_base_url_or_default(&runtime_config),
            "https://www.gravatar.com/avatar"
        );
    }
}

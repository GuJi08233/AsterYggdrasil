//! Avatar runtime configuration.

use crate::config::RuntimeConfig;
use crate::errors::{AsterError, Result};
use aster_forge_utils::url::HttpBaseUrlOptions;

pub use crate::config::definitions::GRAVATAR_BASE_URL_KEY;

const DEFAULT_GRAVATAR_BASE_URL: &str = "https://www.gravatar.com/avatar";

pub fn normalize_gravatar_base_url_config_value(value: &str) -> Result<String> {
    aster_forge_utils::url::normalize_http_base_url(
        value,
        "gravatar_base_url",
        HttpBaseUrlOptions::optional_without_query_fragment(),
    )
    .map_err(|error| AsterError::validation_error(error.to_string()))
    .map(|normalized| normalized.unwrap_or_else(|| DEFAULT_GRAVATAR_BASE_URL.to_string()))
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

#[cfg(test)]
mod tests {
    use super::{gravatar_base_url_or_default, normalize_gravatar_base_url_config_value};
    use crate::config::RuntimeConfig;
    use crate::entities::system_config;
    use crate::types::{SystemConfigSource, SystemConfigValueType, SystemConfigVisibility};
    use chrono::Utc;

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
            category: crate::config::definitions::CONFIG_CATEGORY_USER_AVATAR.to_string(),
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

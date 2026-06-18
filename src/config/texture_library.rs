//! Runtime public texture library configuration.

use crate::config::RuntimeConfig;

pub use crate::config::definitions::{
    TEXTURE_LIBRARY_ENABLED_KEY, TEXTURE_LIBRARY_REVIEW_REQUIRED_KEY,
};

pub const DEFAULT_TEXTURE_LIBRARY_ENABLED: bool = true;
pub const DEFAULT_TEXTURE_LIBRARY_REVIEW_REQUIRED: bool = true;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RuntimeTextureLibraryPolicy {
    pub enabled: bool,
    pub review_required: bool,
}

impl RuntimeTextureLibraryPolicy {
    pub fn from_runtime_config(runtime_config: &RuntimeConfig) -> Self {
        Self {
            enabled: runtime_config
                .get_bool_or(TEXTURE_LIBRARY_ENABLED_KEY, DEFAULT_TEXTURE_LIBRARY_ENABLED),
            review_required: runtime_config.get_bool_or(
                TEXTURE_LIBRARY_REVIEW_REQUIRED_KEY,
                DEFAULT_TEXTURE_LIBRARY_REVIEW_REQUIRED,
            ),
        }
    }
}

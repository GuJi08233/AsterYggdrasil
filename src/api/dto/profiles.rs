//! Project Minecraft profile API DTOs.

use serde::Deserialize;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct CurrentMinecraftProfileListQuery {
    #[validate(length(max = 64, message = "query must not exceed 64 characters"))]
    pub query: Option<String>,
    pub after_id: Option<i64>,
}

#[derive(Debug, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct CreateMinecraftProfileReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_minecraft_profile_name"))]
    pub name: String,
}

#[derive(Debug, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct RenameMinecraftProfileReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_minecraft_profile_name"))]
    pub name: String,
}

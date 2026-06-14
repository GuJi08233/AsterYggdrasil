//! Public external authentication API DTOs.

use serde::Deserialize;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::{IntoParams, ToSchema};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct StartExternalAuthReq {
    #[validate(length(max = 2048, message = "return_path must not exceed 2048 bytes"))]
    pub return_path: Option<String>,
    #[validate(length(max = 2048, message = "redirect_uri must not exceed 2048 bytes"))]
    pub redirect_uri: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct ExternalAuthCallbackQuery {
    pub state: Option<String>,
    pub code: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

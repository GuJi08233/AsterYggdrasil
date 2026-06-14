//! Yggdrasil protocol DTOs.

use serde::{Deserialize, Serialize};
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilErrorBody {
    pub error: &'static str,
    #[serde(rename = "errorMessage")]
    pub error_message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cause: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilProfileProperty {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub name: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub value: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_optional_non_blank"))]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilProfile {
    #[validate(custom(function = "crate::api::dto::validation::validate_unsigned_uuid"))]
    pub id: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_minecraft_profile_name"))]
    pub name: String,
    #[validate(nested)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<Vec<YggdrasilProfileProperty>>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilUser {
    pub id: String,
    pub properties: Vec<YggdrasilProfileProperty>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilAgentReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_yggdrasil_agent_name"))]
    pub name: String,
    #[validate(range(min = 1, max = 1, message = "agent version must be 1"))]
    pub version: i32,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilAuthenticateReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub username: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub password: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_optional_non_blank"))]
    #[serde(rename = "clientToken")]
    pub client_token: Option<String>,
    #[serde(rename = "requestUser", default)]
    pub request_user: bool,
    #[validate(nested)]
    pub agent: Option<YggdrasilAgentReq>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilAuthenticateResp {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "clientToken")]
    pub client_token: String,
    #[serde(rename = "availableProfiles")]
    pub available_profiles: Vec<YggdrasilProfile>,
    #[serde(rename = "selectedProfile", skip_serializing_if = "Option::is_none")]
    pub selected_profile: Option<YggdrasilProfile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<YggdrasilUser>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilRefreshReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_optional_non_blank"))]
    #[serde(rename = "clientToken")]
    pub client_token: Option<String>,
    #[serde(rename = "requestUser", default)]
    pub request_user: bool,
    #[validate(nested)]
    #[serde(rename = "selectedProfile")]
    pub selected_profile: Option<YggdrasilProfile>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilRefreshResp {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "clientToken")]
    pub client_token: String,
    #[serde(rename = "selectedProfile", skip_serializing_if = "Option::is_none")]
    pub selected_profile: Option<YggdrasilProfile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<YggdrasilUser>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilTokenReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_optional_non_blank"))]
    #[serde(rename = "clientToken")]
    pub client_token: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilSignoutReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub username: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    pub password: String,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilJoinReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_unsigned_uuid"))]
    #[serde(rename = "selectedProfile")]
    pub selected_profile: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    #[serde(rename = "serverId")]
    pub server_id: String,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilHasJoinedQuery {
    #[validate(custom(function = "crate::api::dto::validation::validate_minecraft_profile_name"))]
    pub username: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_non_blank"))]
    #[serde(rename = "serverId")]
    pub server_id: String,
    #[validate(custom(function = "crate::api::dto::validation::validate_optional_non_blank"))]
    pub ip: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilProfileQuery {
    pub unsigned: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilMetaResp {
    pub meta: YggdrasilMeta,
    #[serde(rename = "skinDomains")]
    pub skin_domains: Vec<String>,
    #[serde(rename = "signaturePublickey")]
    pub signature_publickey: String,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct YggdrasilMeta {
    #[serde(rename = "serverName")]
    pub server_name: String,
    #[serde(rename = "implementationName")]
    pub implementation_name: String,
    #[serde(rename = "implementationVersion")]
    pub implementation_version: String,
    // authlib-injector's metadata feature flags are dotted keys inside `meta`,
    // not nested objects. Keep this wire shape to match the third-party protocol.
    #[serde(rename = "feature.non_email_login")]
    pub feature_non_email_login: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct CreateMinecraftProfileReq {
    #[validate(custom(function = "crate::api::dto::validation::validate_minecraft_profile_name"))]
    pub name: String,
}

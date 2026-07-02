use serde::Deserialize;

use crate::api::error_code::AsterErrorCode;
use crate::config::yggdrasil::RuntimeYggdrasilPolicy;
use crate::errors::{AsterError, Result};
use crate::runtime::RuntimeConfigRuntimeState;
use crate::utils::OUTBOUND_HTTP_USER_AGENT;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MojangProfileName {
    pub uuid: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MojangProfileNameLookup {
    Found(MojangProfileName),
    NotFound,
}

#[derive(Debug, Deserialize)]
struct MojangProfileResponse {
    id: Option<String>,
    name: Option<String>,
    #[serde(rename = "errorMessage")]
    error_message: Option<String>,
}

pub async fn lookup_profile_name<S>(state: &S, name: &str) -> Result<MojangProfileNameLookup>
where
    S: RuntimeConfigRuntimeState,
{
    let policy = RuntimeYggdrasilPolicy::from_runtime_config(state.runtime_config());
    let url = format!(
        "{}/users/profiles/minecraft/{}",
        policy.mojang_profile_api_base_url.trim_end_matches('/'),
        urlencoding::encode(name)
    );
    let http_client = reqwest::Client::builder()
        .user_agent(OUTBOUND_HTTP_USER_AGENT)
        .timeout(std::time::Duration::from_secs(
            policy.mojang_name_check_timeout_secs,
        ))
        .build()
        .map_err(|error| AsterError::internal_error(format!("build HTTP client: {error}")))?;

    let response = http_client.get(&url).send().await.map_err(|error| {
        tracing::warn!(error = %error, profile_name = %name, "Mojang profile name lookup failed");
        mojang_lookup_failed_error()
    })?;
    let status = response.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Ok(MojangProfileNameLookup::NotFound);
    }
    if !status.is_success() {
        tracing::warn!(
            status = %status,
            profile_name = %name,
            "Mojang profile name lookup returned non-success status"
        );
        return Err(mojang_lookup_failed_error());
    }

    let body = response.json::<MojangProfileResponse>().await.map_err(|error| {
        tracing::warn!(error = %error, profile_name = %name, "Mojang profile name lookup response parse failed");
        mojang_lookup_failed_error()
    })?;
    if let Some(message) = body.error_message.as_deref()
        && message
            .to_ascii_lowercase()
            .contains("couldn't find any profile")
    {
        return Ok(MojangProfileNameLookup::NotFound);
    }
    let (Some(id), Some(name)) = (body.id, body.name) else {
        return Err(mojang_lookup_failed_error());
    };
    let uuid = uuid::Uuid::parse_str(id.trim())
        .map_err(|_| mojang_lookup_failed_error())?
        .simple()
        .to_string();
    Ok(MojangProfileNameLookup::Found(MojangProfileName {
        uuid,
        name,
    }))
}

fn mojang_lookup_failed_error() -> AsterError {
    AsterError::validation_error_code(
        AsterErrorCode::MinecraftProfileMojangLookupFailed,
        "failed to verify Mojang profile name availability",
    )
}

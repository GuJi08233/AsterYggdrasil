use actix_web::HttpRequest;
use serde::{Deserialize, Serialize};

use crate::api::dto::yggdrasil::{YggdrasilJoinReq, YggdrasilProfile};
use crate::cache::CacheExt;
use crate::db::repository::minecraft_profile_repo;
use crate::runtime::{
    AppConfigRuntimeState, CacheRuntimeState, DatabaseRuntimeState, RuntimeConfigRuntimeState,
};
use crate::services::audit_service;
use crate::utils::hash::sha256_hex;

use super::error::{YggdrasilError, YggdrasilErrorKind};
use super::properties;
use super::token::active_token;

const JOIN_CACHE_TTL_SECS: u64 = 30;
const JOIN_CACHE_PREFIX: &str = "yggdrasil:join:";

pub async fn join<S>(
    state: &S,
    body: YggdrasilJoinReq,
    req: &HttpRequest,
) -> std::result::Result<(), YggdrasilError>
where
    S: AppConfigRuntimeState + DatabaseRuntimeState + RuntimeConfigRuntimeState + CacheRuntimeState,
{
    let server_id_hash = sha256_hex(body.server_id.as_bytes());
    tracing::debug!(
        selected_profile_uuid = %body.selected_profile,
        server_id_hash = %server_id_hash,
        "starting yggdrasil join"
    );
    let token = active_token(state, &body.access_token, None).await?;
    let Some(selected_profile_id) = token.selected_profile_id else {
        tracing::debug!(
            token_id = token.id,
            user_id = token.user_id,
            "yggdrasil join rejected because token has no selected profile"
        );
        return Err(YggdrasilError::new(YggdrasilErrorKind::InvalidToken));
    };
    let profile = minecraft_profile_repo::find_by_id(state.reader_db(), selected_profile_id)
        .await
        .map_err(YggdrasilError::from)?;
    if profile.uuid != body.selected_profile {
        tracing::debug!(
            token_id = token.id,
            profile_id = profile.id,
            expected_profile_uuid = %profile.uuid,
            requested_profile_uuid = %body.selected_profile,
            "yggdrasil join rejected because selected profile did not match token"
        );
        return Err(YggdrasilError::new(YggdrasilErrorKind::InvalidToken));
    }

    let session = YggdrasilJoinSession {
        profile_id: profile.id,
        profile_uuid: profile.uuid.clone(),
        profile_name: profile.name.clone(),
        server_id: body.server_id.clone(),
        ip_address: real_join_client_ip(state, req),
    };
    state
        .cache()
        .as_ref()
        .set(
            &join_cache_key(&body.server_id),
            &session,
            Some(JOIN_CACHE_TTL_SECS),
        )
        .await;
    let ctx = audit_service::AuditContext::from_request(req, token.user_id);
    audit_service::log_with_details(
        state,
        &ctx,
        audit_service::AuditAction::YggdrasilJoinServer,
        audit_service::AuditEntityType::YggdrasilSession,
        Some(profile.id),
        Some(&profile.name),
        || {
            audit_service::details(audit_service::YggdrasilJoinAuditDetails {
                profile_uuid: &profile.uuid,
                profile_name: &profile.name,
                server_id_hash: &server_id_hash,
            })
        },
    )
    .await;
    tracing::debug!(
        token_id = token.id,
        user_id = token.user_id,
        profile_id = profile.id,
        profile_uuid = %profile.uuid,
        server_id_hash = %server_id_hash,
        has_ip_address = session.ip_address.is_some(),
        "yggdrasil join recorded"
    );
    Ok(())
}

fn real_join_client_ip<S: AppConfigRuntimeState>(state: &S, req: &HttpRequest) -> Option<String> {
    let peer = req.peer_addr()?.ip();
    // The authlib-injector hasJoined `ip` parameter is the client IP observed
    // by the Minecraft server. When the Yggdrasil server is behind a trusted
    // reverse proxy, record the same forwarded client IP instead of the proxy
    // socket address so prevent-proxy-connections checks can match.
    Some(
        crate::utils::net::real_ip_from_headers(
            req.headers(),
            peer,
            &state.config().network_trust.trusted_proxies,
        )
        .to_string(),
    )
}

pub async fn has_joined<S>(
    state: &S,
    username: &str,
    server_id: &str,
    ip: Option<&str>,
) -> std::result::Result<Option<YggdrasilProfile>, YggdrasilError>
where
    S: DatabaseRuntimeState + RuntimeConfigRuntimeState + CacheRuntimeState,
{
    let server_id_hash = sha256_hex(server_id.as_bytes());
    tracing::debug!(
        username,
        server_id_hash = %server_id_hash,
        has_ip = ip.is_some(),
        "checking yggdrasil hasJoined"
    );
    let Some(session) = state
        .cache()
        .as_ref()
        .get::<YggdrasilJoinSession>(&join_cache_key(server_id))
        .await
    else {
        tracing::debug!(
            username,
            server_id_hash = %server_id_hash,
            "yggdrasil hasJoined cache miss"
        );
        return Ok(None);
    };
    if session.server_id != server_id || session.profile_name != username {
        tracing::debug!(
            username,
            cached_profile_name = %session.profile_name,
            server_id_hash = %server_id_hash,
            "yggdrasil hasJoined cache record did not match request"
        );
        return Ok(None);
    }
    if let Some(ip) = ip
        && session.ip_address.as_deref() != Some(ip)
    {
        tracing::debug!(
            username,
            server_id_hash = %server_id_hash,
            has_cached_ip = session.ip_address.is_some(),
            "yggdrasil hasJoined rejected because client ip did not match"
        );
        return Ok(None);
    }

    let profile = minecraft_profile_repo::find_by_id(state.reader_db(), session.profile_id)
        .await
        .map_err(YggdrasilError::from)?;
    tracing::debug!(
        profile_id = profile.id,
        profile_uuid = %profile.uuid,
        server_id_hash = %server_id_hash,
        "yggdrasil hasJoined matched profile"
    );
    Ok(Some(
        properties::profile_with_properties(state, &profile, true).await?,
    ))
}

fn join_cache_key(server_id: &str) -> String {
    format!("{JOIN_CACHE_PREFIX}{}", sha256_hex(server_id.as_bytes()))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct YggdrasilJoinSession {
    profile_id: i64,
    profile_uuid: String,
    profile_name: String,
    server_id: String,
    ip_address: Option<String>,
}

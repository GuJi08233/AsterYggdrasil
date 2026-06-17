use chrono::{SecondsFormat, Utc};
use rsa::RsaPrivateKey;
use rsa::pkcs1::{EncodeRsaPrivateKey, EncodeRsaPublicKey, LineEnding};

use crate::api::dto::yggdrasil::{
    MinecraftServicesBanStatus, MinecraftServicesCertificateResp, MinecraftServicesChatPreferences,
    MinecraftServicesFriendsPreferences, MinecraftServicesKeyPair,
    MinecraftServicesPlayerAttributesResp, MinecraftServicesPreferenceState,
    MinecraftServicesPrivacyBlocklistResp, MinecraftServicesPrivilege, MinecraftServicesPrivileges,
    MinecraftServicesPrivilegesResp, MinecraftServicesProfanityFilterPreferences,
};
use crate::errors::AsterError;
use crate::runtime::DatabaseRuntimeState;

use super::{YggdrasilError, YggdrasilErrorKind, active_token_for_protocol};

const PROFILE_KEY_BITS: usize = 2048;
const DUMMY_PUBLIC_KEY_SIGNATURE: &str = "AA==";

pub async fn profile_key_certificate<S: DatabaseRuntimeState>(
    state: &S,
    access_token: &str,
) -> std::result::Result<MinecraftServicesCertificateResp, YggdrasilError> {
    let token = active_token_for_protocol(state, access_token).await?;
    if token.selected_profile_id.is_none() {
        tracing::debug!(
            token_id = token.id,
            user_id = token.user_id,
            "minecraft services certificate rejected token without selected profile"
        );
        return Err(YggdrasilError::new(YggdrasilErrorKind::InvalidToken));
    }

    tracing::debug!(
        token_id = token.id,
        user_id = token.user_id,
        selected_profile_id = token.selected_profile_id,
        "issuing minecraft services profile key certificate"
    );

    let key_pair = generate_profile_key_pair().map_err(YggdrasilError::from)?;
    let now = Utc::now();
    Ok(MinecraftServicesCertificateResp {
        key_pair,
        public_key_signature: DUMMY_PUBLIC_KEY_SIGNATURE.to_string(),
        public_key_signature_v2: DUMMY_PUBLIC_KEY_SIGNATURE.to_string(),
        expires_at: (now + chrono::Duration::hours(48)).to_rfc3339_opts(SecondsFormat::Secs, true),
        refreshed_after: (now + chrono::Duration::hours(36))
            .to_rfc3339_opts(SecondsFormat::Secs, true),
    })
}

pub async fn minecraft_services_privileges<S: DatabaseRuntimeState>(
    state: &S,
    access_token: &str,
) -> std::result::Result<MinecraftServicesPrivilegesResp, YggdrasilError> {
    validate_minecraft_services_token(state, access_token).await?;
    Ok(MinecraftServicesPrivilegesResp {
        privileges: permissive_privileges(),
    })
}

pub async fn minecraft_services_player_attributes<S: DatabaseRuntimeState>(
    state: &S,
    access_token: &str,
) -> std::result::Result<MinecraftServicesPlayerAttributesResp, YggdrasilError> {
    validate_minecraft_services_token(state, access_token).await?;
    Ok(MinecraftServicesPlayerAttributesResp {
        privileges: permissive_privileges(),
        // TODO(moderation): derive these values from account/profile ban and
        // social preference state instead of always returning unrestricted defaults.
        profanity_filter_preferences: MinecraftServicesProfanityFilterPreferences {
            profanity_filter_on: false,
        },
        friends_preferences: MinecraftServicesFriendsPreferences {
            friends: MinecraftServicesPreferenceState::Disabled,
            accept_invites: MinecraftServicesPreferenceState::Disabled,
        },
        chat_preferences: MinecraftServicesChatPreferences {
            text_communication: MinecraftServicesPreferenceState::Enabled,
        },
        ban_status: MinecraftServicesBanStatus {
            banned_scopes: Default::default(),
        },
    })
}

pub async fn minecraft_services_privacy_blocklist<S: DatabaseRuntimeState>(
    state: &S,
    access_token: &str,
) -> std::result::Result<MinecraftServicesPrivacyBlocklistResp, YggdrasilError> {
    validate_minecraft_services_token(state, access_token).await?;
    Ok(MinecraftServicesPrivacyBlocklistResp {
        blocked_profiles: Vec::new(),
    })
}

async fn validate_minecraft_services_token<S: DatabaseRuntimeState>(
    state: &S,
    access_token: &str,
) -> std::result::Result<(), YggdrasilError> {
    let token = active_token_for_protocol(state, access_token).await?;
    tracing::debug!(
        token_id = token.id,
        user_id = token.user_id,
        selected_profile_id = token.selected_profile_id,
        "validated minecraft services policy bearer token"
    );
    Ok(())
}

fn permissive_privileges() -> MinecraftServicesPrivileges {
    // TODO(moderation): disable chat/multiplayer scopes here for banned profiles.
    MinecraftServicesPrivileges {
        online_chat: MinecraftServicesPrivilege { enabled: true },
        multiplayer_server: MinecraftServicesPrivilege { enabled: true },
        multiplayer_realms: MinecraftServicesPrivilege { enabled: true },
        telemetry: MinecraftServicesPrivilege { enabled: true },
        optional_telemetry: MinecraftServicesPrivilege { enabled: true },
    }
}

fn generate_profile_key_pair() -> crate::errors::Result<MinecraftServicesKeyPair> {
    let mut rng = rand::rng();
    let private_key = RsaPrivateKey::new(&mut rng, PROFILE_KEY_BITS).map_err(|error| {
        AsterError::internal_error(format!(
            "failed to generate minecraft services profile key: {error}"
        ))
    })?;
    let public_key = private_key.to_public_key();

    let private_key = private_key
        .to_pkcs1_pem(LineEnding::LF)
        .map(|pem| pem.to_string())
        .map_err(|error| {
            AsterError::internal_error(format!(
                "failed to encode minecraft services private key: {error}"
            ))
        })?;
    let public_key = public_key.to_pkcs1_pem(LineEnding::LF).map_err(|error| {
        AsterError::internal_error(format!(
            "failed to encode minecraft services public key: {error}"
        ))
    })?;

    Ok(MinecraftServicesKeyPair {
        private_key,
        public_key,
    })
}

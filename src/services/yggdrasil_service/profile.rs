use crate::api::dto::yggdrasil::YggdrasilProfile;
use crate::config::yggdrasil::RuntimeYggdrasilPolicy;
use crate::db::repository::{minecraft_profile_repo, yggdrasil_token_repo};
use crate::entities::minecraft_profile;
use crate::errors::{AsterError, Result};
use crate::runtime::{DatabaseRuntimeState, RuntimeConfigRuntimeState, TextureStorageRuntimeState};
use crate::services::texture_service;
use serde::Serialize;

#[derive(Debug, Clone)]
pub struct DeleteMinecraftProfileResult {
    pub profile: minecraft_profile::Model,
    pub deleted_texture_count: usize,
    pub revoked_token_count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(utoipa::ToSchema))]
pub struct MinecraftProfileInfo {
    pub id: i64,
    pub user_id: i64,
    pub uuid: String,
    pub name: String,
    pub uploadable_textures: String,
    pub texture_model: crate::types::MinecraftTextureModel,
    #[cfg_attr(all(debug_assertions, feature = "openapi"), schema(value_type = String))]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[cfg_attr(all(debug_assertions, feature = "openapi"), schema(value_type = String))]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub fn profile_summary(profile: &minecraft_profile::Model) -> YggdrasilProfile {
    YggdrasilProfile {
        id: profile.uuid.clone(),
        name: profile.name.clone(),
        properties: None,
    }
}

pub fn profile_info(profile: &minecraft_profile::Model) -> MinecraftProfileInfo {
    MinecraftProfileInfo {
        id: profile.id,
        user_id: profile.user_id,
        uuid: profile.uuid.clone(),
        name: profile.name.clone(),
        uploadable_textures: profile.uploadable_textures.clone(),
        texture_model: profile.texture_model,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    }
}

pub async fn create_profile<S>(
    state: &S,
    user_id: i64,
    name: &str,
) -> Result<minecraft_profile::Model>
where
    S: DatabaseRuntimeState + RuntimeConfigRuntimeState,
{
    tracing::debug!(user_id, name_len = name.len(), "creating minecraft profile");
    validate_profile_name(name)?;
    if minecraft_profile_repo::find_by_name(state.reader_db(), name)
        .await?
        .is_some()
    {
        tracing::debug!(
            user_id,
            profile_name = name,
            "minecraft profile creation rejected because name is taken"
        );
        return Err(AsterError::validation_error_code(
            crate::api::error_code::AsterErrorCode::MinecraftProfileNameTaken,
            "profile name already exists",
        ));
    }
    let policy = RuntimeYggdrasilPolicy::from_runtime_config(state.runtime_config());
    let profile = minecraft_profile_repo::create(
        state.writer_db(),
        user_id,
        &crate::utils::id::new_unsigned_uuid(),
        name,
        crate::types::MinecraftTextureModel::Default,
        &policy.uploadable_textures_value(),
    )
    .await?;
    tracing::debug!(
        user_id,
        profile_id = profile.id,
        profile_uuid = %profile.uuid,
        uploadable_textures = %profile.uploadable_textures,
        "created minecraft profile"
    );
    Ok(profile)
}

pub async fn delete_profile_for_user<S>(
    state: &S,
    user_id: i64,
    uuid: &str,
) -> Result<Option<DeleteMinecraftProfileResult>>
where
    S: DatabaseRuntimeState + TextureStorageRuntimeState,
{
    tracing::debug!(
        user_id,
        profile_uuid = uuid,
        "deleting minecraft profile for user"
    );
    let Some(profile) =
        minecraft_profile_repo::find_by_uuid_for_user(state.reader_db(), uuid, user_id).await?
    else {
        tracing::debug!(
            user_id,
            profile_uuid = uuid,
            "minecraft profile delete skipped because profile was not found"
        );
        return Ok(None);
    };

    let deleted_textures = texture_service::delete_all_textures_for_profile(state, &profile)
        .await
        .map_err(|error| AsterError::internal_error(error.protocol_message()))?;
    let revoked_token_count =
        yggdrasil_token_repo::revoke_all_for_selected_profile(state.writer_db(), profile.id)
            .await?;
    let deleted_profile = minecraft_profile_repo::delete_by_id(state.writer_db(), profile.id)
        .await?
        .unwrap_or_else(|| profile.clone());

    tracing::debug!(
        user_id,
        profile_id = deleted_profile.id,
        profile_uuid = %deleted_profile.uuid,
        deleted_texture_count = deleted_textures.len(),
        revoked_token_count,
        "deleted minecraft profile"
    );
    Ok(Some(DeleteMinecraftProfileResult {
        profile: deleted_profile,
        deleted_texture_count: deleted_textures.len(),
        revoked_token_count,
    }))
}

pub fn validate_profile_name(name: &str) -> Result<()> {
    let valid_len = (3..=16).contains(&name.len());
    let valid_chars = name
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    if !valid_len || !valid_chars {
        return Err(AsterError::validation_error(
            "profile name must be 3-16 ASCII letters, numbers, or underscores",
        ));
    }
    Ok(())
}

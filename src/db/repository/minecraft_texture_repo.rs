//! Minecraft texture asset repository.

use crate::entities::minecraft_texture::{self, Entity as MinecraftTexture};
use crate::errors::{AsterError, MapAsterErr, Result};
use crate::types::{MinecraftTextureModel, MinecraftTextureType, MinecraftTextureVisibility};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, ModelTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set,
};

#[derive(Debug, Clone)]
pub struct CreateMinecraftTexture<'a> {
    pub user_id: i64,
    pub texture_type: MinecraftTextureType,
    pub hash: &'a str,
    pub storage_key: &'a str,
    pub mime_type: &'a str,
    pub file_size: i64,
    pub width: i32,
    pub height: i32,
    pub texture_model: MinecraftTextureModel,
    pub visibility: MinecraftTextureVisibility,
    pub is_wardrobe_item: bool,
}

pub async fn create<C: ConnectionTrait>(
    db: &C,
    input: CreateMinecraftTexture<'_>,
) -> Result<minecraft_texture::Model> {
    let now = chrono::Utc::now();
    minecraft_texture::ActiveModel {
        user_id: Set(input.user_id),
        texture_type: Set(input.texture_type),
        hash: Set(input.hash.to_string()),
        storage_key: Set(input.storage_key.to_string()),
        mime_type: Set(input.mime_type.to_string()),
        file_size: Set(input.file_size),
        width: Set(input.width),
        height: Set(input.height),
        texture_model: Set(input.texture_model),
        visibility: Set(input.visibility),
        is_wardrobe_item: Set(input.is_wardrobe_item),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    }
    .insert(db)
    .await
    .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_id_for_user<C: ConnectionTrait>(
    db: &C,
    id: i64,
    user_id: i64,
) -> Result<Option<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::Id.eq(id))
        .filter(minecraft_texture::Column::UserId.eq(user_id))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn list_by_user<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
) -> Result<Vec<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::UserId.eq(user_id))
        .filter(minecraft_texture::Column::IsWardrobeItem.eq(true))
        .order_by_desc(minecraft_texture::Column::UpdatedAt)
        .order_by_desc(minecraft_texture::Column::Id)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_wardrobe_by_fingerprint<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
    texture_type: MinecraftTextureType,
    hash: &str,
    texture_model: MinecraftTextureModel,
) -> Result<Option<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::UserId.eq(user_id))
        .filter(minecraft_texture::Column::TextureType.eq(texture_type))
        .filter(minecraft_texture::Column::Hash.eq(hash))
        .filter(minecraft_texture::Column::TextureModel.eq(texture_model))
        .filter(minecraft_texture::Column::IsWardrobeItem.eq(true))
        .order_by_asc(minecraft_texture::Column::Id)
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn list_all<C: ConnectionTrait>(db: &C) -> Result<Vec<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .order_by_asc(minecraft_texture::Column::Id)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn list_by_hash<C: ConnectionTrait>(
    db: &C,
    hash: &str,
) -> Result<Vec<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::Hash.eq(hash))
        .order_by_asc(minecraft_texture::Column::Id)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_hash<C: ConnectionTrait>(
    db: &C,
    hash: &str,
) -> Result<Option<minecraft_texture::Model>> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::Hash.eq(hash))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn mark_as_wardrobe_item<C: ConnectionTrait>(
    db: &C,
    texture: minecraft_texture::Model,
) -> Result<minecraft_texture::Model> {
    let now = chrono::Utc::now();
    let mut active: minecraft_texture::ActiveModel = texture.into();
    active.is_wardrobe_item = Set(true);
    active.updated_at = Set(now);
    active
        .update(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn count_by_storage_key<C: ConnectionTrait>(db: &C, storage_key: &str) -> Result<u64> {
    MinecraftTexture::find()
        .filter(minecraft_texture::Column::StorageKey.eq(storage_key))
        .count(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn delete_by_hash<C: ConnectionTrait>(
    db: &C,
    hash: &str,
) -> Result<Vec<minecraft_texture::Model>> {
    let textures = list_by_hash(db, hash).await?;
    for texture in &textures {
        texture
            .clone()
            .delete(db)
            .await
            .map_aster_err(AsterError::database_operation)?;
    }
    Ok(textures)
}

pub async fn delete_by_id_for_user<C: ConnectionTrait>(
    db: &C,
    id: i64,
    user_id: i64,
) -> Result<Option<minecraft_texture::Model>> {
    let Some(texture) = find_by_id_for_user(db, id, user_id).await? else {
        return Ok(None);
    };
    texture
        .clone()
        .delete(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(Some(texture))
}

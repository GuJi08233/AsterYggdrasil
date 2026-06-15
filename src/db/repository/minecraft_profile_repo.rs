//! Minecraft profile repository.

use crate::api::pagination::{OffsetPage, load_offset_page};
use crate::db::repository::search_query;
use crate::entities::minecraft_profile::{self, Entity as MinecraftProfile};
use crate::errors::{AsterError, MapAsterErr, Result};
use crate::types::MinecraftTextureModel;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, ExprTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Set,
};

#[derive(Debug, Clone, Default)]
pub struct MinecraftProfileFilters {
    pub user_id: Option<i64>,
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub query: Option<String>,
}

pub async fn create<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
    uuid: &str,
    name: &str,
    texture_model: MinecraftTextureModel,
    uploadable_textures: &str,
) -> Result<minecraft_profile::Model> {
    let now = chrono::Utc::now();
    minecraft_profile::ActiveModel {
        user_id: Set(user_id),
        uuid: Set(uuid.to_string()),
        name: Set(name.to_string()),
        texture_model: Set(texture_model),
        uploadable_textures: Set(uploadable_textures.to_string()),
        created_at: Set(now),
        updated_at: Set(now),
        ..Default::default()
    }
    .insert(db)
    .await
    .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_id<C: ConnectionTrait>(db: &C, id: i64) -> Result<minecraft_profile::Model> {
    MinecraftProfile::find_by_id(id)
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)?
        .ok_or_else(|| AsterError::record_not_found(format!("minecraft profile #{id}")))
}

pub async fn find_by_uuid<C: ConnectionTrait>(
    db: &C,
    uuid: &str,
) -> Result<Option<minecraft_profile::Model>> {
    MinecraftProfile::find()
        .filter(minecraft_profile::Column::Uuid.eq(uuid))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_uuid_for_user<C: ConnectionTrait>(
    db: &C,
    uuid: &str,
    user_id: i64,
) -> Result<Option<minecraft_profile::Model>> {
    MinecraftProfile::find()
        .filter(minecraft_profile::Column::Uuid.eq(uuid))
        .filter(minecraft_profile::Column::UserId.eq(user_id))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_name<C: ConnectionTrait>(
    db: &C,
    name: &str,
) -> Result<Option<minecraft_profile::Model>> {
    MinecraftProfile::find()
        .filter(minecraft_profile::Column::Name.eq(name))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn delete_by_id<C: ConnectionTrait>(
    db: &C,
    id: i64,
) -> Result<Option<minecraft_profile::Model>> {
    let Some(existing) = MinecraftProfile::find_by_id(id)
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)?
    else {
        return Ok(None);
    };
    let active: minecraft_profile::ActiveModel = existing.clone().into();
    active
        .delete(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(Some(existing))
}

pub async fn update_name_by_id<C: ConnectionTrait>(
    db: &C,
    id: i64,
    name: &str,
) -> Result<Option<minecraft_profile::Model>> {
    let Some(existing) = MinecraftProfile::find_by_id(id)
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)?
    else {
        return Ok(None);
    };
    let mut active: minecraft_profile::ActiveModel = existing.into();
    active.name = Set(name.to_string());
    active.updated_at = Set(chrono::Utc::now());
    let updated = active
        .update(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(Some(updated))
}

pub async fn list_by_user<C: ConnectionTrait>(
    db: &C,
    user_id: i64,
) -> Result<Vec<minecraft_profile::Model>> {
    MinecraftProfile::find()
        .filter(minecraft_profile::Column::UserId.eq(user_id))
        .order_by_asc(minecraft_profile::Column::Id)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn list_paginated<C: ConnectionTrait>(
    db: &C,
    filters: MinecraftProfileFilters,
    limit: u64,
    offset: u64,
) -> Result<OffsetPage<minecraft_profile::Model>> {
    load_offset_page(limit, offset, 100, |limit, offset| async move {
        let query = apply_filters(MinecraftProfile::find(), &filters)
            .order_by_asc(minecraft_profile::Column::Id);
        let total = query
            .clone()
            .count(db)
            .await
            .map_aster_err(AsterError::database_operation)?;
        let items = query
            .limit(limit)
            .offset(offset)
            .all(db)
            .await
            .map_aster_err(AsterError::database_operation)?;
        Ok((items, total))
    })
    .await
}

fn apply_filters(
    mut query: sea_orm::Select<MinecraftProfile>,
    filters: &MinecraftProfileFilters,
) -> sea_orm::Select<MinecraftProfile> {
    if let Some(user_id) = filters.user_id {
        query = query.filter(minecraft_profile::Column::UserId.eq(user_id));
    }
    if let Some(name) = filters
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        query = query.filter(minecraft_profile::Column::Name.eq(name));
    }
    if let Some(uuid) = filters
        .uuid
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        query = query.filter(minecraft_profile::Column::Uuid.eq(uuid));
    }
    if let Some(search) = filters
        .query
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        query = query.filter(
            search_query::lower_like_condition(minecraft_profile::Column::Name, search).or(
                search_query::lower_like_condition(minecraft_profile::Column::Uuid, search),
            ),
        );
    }
    query
}

pub async fn list_by_names<C: ConnectionTrait>(
    db: &C,
    names: &[String],
) -> Result<Vec<minecraft_profile::Model>> {
    if names.is_empty() {
        return Ok(Vec::new());
    }

    MinecraftProfile::find()
        .filter(minecraft_profile::Column::Name.is_in(names.iter().cloned()))
        .order_by_asc(minecraft_profile::Column::Id)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

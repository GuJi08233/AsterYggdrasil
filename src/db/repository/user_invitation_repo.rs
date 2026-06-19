//! User invitation repository.

use crate::entities::user_invitation::{self, Entity as UserInvitation};
use crate::errors::{AsterError, MapAsterErr, Result};
use crate::types::UserInvitationStatus;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, sea_query::Expr,
};

pub async fn create<C: ConnectionTrait>(
    db: &C,
    model: user_invitation::ActiveModel,
) -> Result<user_invitation::Model> {
    model
        .insert(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_by_id<C: ConnectionTrait>(db: &C, id: i64) -> Result<user_invitation::Model> {
    UserInvitation::find_by_id(id)
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)?
        .ok_or_else(|| AsterError::record_not_found(format!("user invitation #{id}")))
}

pub async fn find_by_token_hash<C: ConnectionTrait>(
    db: &C,
    token_hash: &str,
) -> Result<Option<user_invitation::Model>> {
    UserInvitation::find()
        .filter(user_invitation::Column::TokenHash.eq(token_hash))
        .one(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

pub async fn find_pending_by_email<C: ConnectionTrait>(
    db: &C,
    email: &str,
) -> Result<Vec<user_invitation::Model>> {
    UserInvitation::find()
        .filter(user_invitation::Column::Email.eq(email))
        .filter(user_invitation::Column::Status.eq(UserInvitationStatus::Pending))
        .order_by_desc(user_invitation::Column::CreatedAt)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)
}

#[derive(Debug, Clone)]
pub struct UserInvitationCursorSlice {
    pub items: Vec<user_invitation::Model>,
    pub total: u64,
    pub has_more: bool,
}

pub async fn list_cursor<C: ConnectionTrait>(
    db: &C,
    limit: u64,
) -> Result<UserInvitationCursorSlice> {
    list_cursor_after(db, limit, None).await
}

pub async fn list_cursor_after<C: ConnectionTrait>(
    db: &C,
    limit: u64,
    after: Option<(chrono::DateTime<chrono::Utc>, i64)>,
) -> Result<UserInvitationCursorSlice> {
    let limit = limit.clamp(1, 100);
    let mut query = UserInvitation::find();
    let total = query
        .clone()
        .count(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    if let Some((created_at, id)) = after {
        query = query.filter(
            Condition::any()
                .add(user_invitation::Column::CreatedAt.lt(created_at))
                .add(
                    Condition::all()
                        .add(user_invitation::Column::CreatedAt.eq(created_at))
                        .add(user_invitation::Column::Id.lt(id)),
                ),
        );
    }
    let fetch_limit = limit.saturating_add(1);
    let mut items = query
        .order_by_desc(user_invitation::Column::CreatedAt)
        .order_by_desc(user_invitation::Column::Id)
        .limit(fetch_limit)
        .all(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    let has_more =
        crate::utils::numbers::usize_to_u64(items.len(), "user invitation page size")? > limit;
    if has_more {
        items.truncate(usize::try_from(limit).unwrap_or(usize::MAX));
    }
    Ok(UserInvitationCursorSlice {
        items,
        total,
        has_more,
    })
}

pub async fn mark_revoked_if_pending<C: ConnectionTrait>(db: &C, id: i64) -> Result<bool> {
    let now = Utc::now();
    let result = UserInvitation::update_many()
        .col_expr(
            user_invitation::Column::Status,
            Expr::value(UserInvitationStatus::Revoked),
        )
        .col_expr(user_invitation::Column::UpdatedAt, Expr::value(now))
        .col_expr(user_invitation::Column::RevokedAt, Expr::value(Some(now)))
        .filter(user_invitation::Column::Id.eq(id))
        .filter(user_invitation::Column::Status.eq(UserInvitationStatus::Pending))
        .exec(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(result.rows_affected == 1)
}

pub async fn mark_expired_if_pending<C: ConnectionTrait>(db: &C, id: i64) -> Result<bool> {
    let result = UserInvitation::update_many()
        .col_expr(
            user_invitation::Column::Status,
            Expr::value(UserInvitationStatus::Expired),
        )
        .col_expr(user_invitation::Column::UpdatedAt, Expr::value(Utc::now()))
        .filter(user_invitation::Column::Id.eq(id))
        .filter(user_invitation::Column::Status.eq(UserInvitationStatus::Pending))
        .exec(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(result.rows_affected == 1)
}

pub async fn mark_accepted_if_pending<C: ConnectionTrait>(
    db: &C,
    id: i64,
    accepted_user_id: i64,
) -> Result<bool> {
    let now = Utc::now();
    let result = UserInvitation::update_many()
        .col_expr(
            user_invitation::Column::Status,
            Expr::value(UserInvitationStatus::Accepted),
        )
        .col_expr(
            user_invitation::Column::AcceptedUserId,
            Expr::value(Some(accepted_user_id)),
        )
        .col_expr(user_invitation::Column::AcceptedAt, Expr::value(Some(now)))
        .col_expr(user_invitation::Column::UpdatedAt, Expr::value(now))
        .filter(user_invitation::Column::Id.eq(id))
        .filter(user_invitation::Column::Status.eq(UserInvitationStatus::Pending))
        .filter(user_invitation::Column::ExpiresAt.gt(now))
        .exec(db)
        .await
        .map_aster_err(AsterError::database_operation)?;
    Ok(result.rows_affected == 1)
}

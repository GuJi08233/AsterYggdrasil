//! Generic API pagination and sorting primitives.

use crate::errors::{AsterError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::future::Future;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::{IntoParams, ToSchema};

pub const DEFAULT_PAGE_LIMIT: u64 = 100;
pub const MAX_PAGE_SIZE: u64 = 1000;

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct LimitQuery {
    pub limit: Option<u64>,
}

impl LimitQuery {
    pub fn limit_or(&self, default: u64, max: u64) -> u64 {
        self.limit
            .map(|value| value.clamp(1, max))
            .unwrap_or(default)
    }

    pub fn limit(&self) -> u64 {
        self.limit_or(DEFAULT_PAGE_LIMIT, MAX_PAGE_SIZE)
    }
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct CreatedAtCursorQuery {
    pub after_created_at: Option<DateTime<Utc>>,
    pub after_id: Option<i64>,
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct UpdatedAtCursorQuery {
    pub after_updated_at: Option<DateTime<Utc>>,
    pub after_id: Option<i64>,
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct LimitOffsetQuery {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

impl LimitOffsetQuery {
    pub fn limit_or(&self, default: u64, max: u64) -> u64 {
        self.limit
            .map(|value| value.clamp(1, max))
            .unwrap_or(default)
    }

    pub fn limit(&self) -> u64 {
        self.limit_or(DEFAULT_PAGE_LIMIT, MAX_PAGE_SIZE)
    }

    pub fn offset(&self) -> u64 {
        self.offset.unwrap_or(0)
    }
}

#[cfg(all(debug_assertions, feature = "openapi"))]
#[doc(hidden)]
pub trait ApiSchema: ToSchema {}

#[cfg(all(debug_assertions, feature = "openapi"))]
impl<T: ToSchema> ApiSchema for T {}

#[cfg(not(all(debug_assertions, feature = "openapi")))]
#[doc(hidden)]
pub trait ApiSchema {}

#[cfg(not(all(debug_assertions, feature = "openapi")))]
impl<T> ApiSchema for T {}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct OffsetPage<T: Serialize + ApiSchema> {
    pub items: Vec<T>,
    pub total: u64,
    pub limit: u64,
    pub offset: u64,
}

impl<T: Serialize + ApiSchema> OffsetPage<T> {
    pub fn new(items: Vec<T>, total: u64, limit: u64, offset: u64) -> Self {
        Self {
            items,
            total,
            limit,
            offset,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct CursorPage<T: Serialize + ApiSchema, C: Serialize + ApiSchema> {
    pub items: Vec<T>,
    pub total: u64,
    pub limit: u64,
    pub offset: u64,
    pub next_cursor: Option<C>,
}

impl<T: Serialize + ApiSchema, C: Serialize + ApiSchema> CursorPage<T, C> {
    pub fn new(items: Vec<T>, total: u64, limit: u64, offset: u64, next_cursor: Option<C>) -> Self {
        Self {
            items,
            total,
            limit,
            offset,
            next_cursor,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct IdCursor {
    pub id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct DateTimeIdCursor {
    #[cfg_attr(all(debug_assertions, feature = "openapi"), schema(value_type = String))]
    pub value: DateTime<Utc>,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct DateTimeStringCursor {
    #[cfg_attr(all(debug_assertions, feature = "openapi"), schema(value_type = String))]
    pub value: DateTime<Utc>,
    pub id: String,
}

pub fn parse_datetime_id_cursor(
    value: Option<DateTime<Utc>>,
    id: Option<i64>,
    value_name: &str,
) -> Result<Option<(DateTime<Utc>, i64)>> {
    match (value, id) {
        (None, None) => Ok(None),
        (Some(value), Some(id)) if id > 0 => Ok(Some((value, id))),
        (Some(_), Some(_)) => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must be positive",
        ))),
        _ => Err(AsterError::validation_error(format!(
            "{value_name} cursor requires both value and id",
        ))),
    }
}

pub fn parse_datetime_string_cursor(
    value: Option<DateTime<Utc>>,
    id: Option<String>,
    value_name: &str,
) -> Result<Option<(DateTime<Utc>, String)>> {
    match (value, id) {
        (None, None) => Ok(None),
        (Some(value), Some(id)) if !id.trim().is_empty() => Ok(Some((value, id))),
        (Some(_), Some(_)) => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must not be empty",
        ))),
        _ => Err(AsterError::validation_error(format!(
            "{value_name} cursor requires both value and id",
        ))),
    }
}

pub fn parse_id_cursor(id: Option<i64>, value_name: &str) -> Result<Option<i64>> {
    match id {
        None => Ok(None),
        Some(id) if id > 0 => Ok(Some(id)),
        Some(_) => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must be positive",
        ))),
    }
}

pub async fn load_offset_page<T, F, Fut>(
    limit: u64,
    offset: u64,
    max_limit: u64,
    fetch: F,
) -> Result<OffsetPage<T>>
where
    T: Serialize + ApiSchema,
    F: FnOnce(u64, u64) -> Fut,
    Fut: Future<Output = Result<(Vec<T>, u64)>>,
{
    let limit = limit.clamp(1, max_limit);
    let (items, total) = fetch(limit, offset).await?;
    Ok(OffsetPage::new(items, total, limit, offset))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    #[default]
    Asc,
    Desc,
}

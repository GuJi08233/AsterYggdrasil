//! Generic API pagination and sorting primitives.

use crate::errors::{AsterError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
pub struct CursorPage<T: Serialize + ApiSchema, C: Serialize + ApiSchema> {
    pub items: Vec<T>,
    pub total: u64,
    pub limit: u64,
    pub next_cursor: Option<C>,
}

impl<T: Serialize + ApiSchema, C: Serialize + ApiSchema> CursorPage<T, C> {
    pub fn new(items: Vec<T>, total: u64, limit: u64, next_cursor: Option<C>) -> Self {
        Self {
            items,
            total,
            limit,
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
pub struct StringIdCursor {
    pub value: String,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct SortOrderNameIdCursor {
    pub sort_order: i32,
    pub name: String,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct EnabledPriorityIdCursor {
    pub enabled: bool,
    pub priority: i32,
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

pub fn parse_string_id_cursor(
    value: Option<String>,
    id: Option<i64>,
    value_name: &str,
) -> Result<Option<(String, i64)>> {
    match (value, id) {
        (None, None) => Ok(None),
        (Some(value), Some(id)) if !value.trim().is_empty() && id > 0 => Ok(Some((value, id))),
        (Some(_), Some(id)) if id <= 0 => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must be positive",
        ))),
        (Some(_), Some(_)) => Err(AsterError::validation_error(format!(
            "{value_name} cursor value must not be empty",
        ))),
        _ => Err(AsterError::validation_error(format!(
            "{value_name} cursor requires both value and id",
        ))),
    }
}

pub fn parse_sort_order_name_id_cursor(
    sort_order: Option<i32>,
    name: Option<String>,
    id: Option<i64>,
    value_name: &str,
) -> Result<Option<(i32, String, i64)>> {
    match (sort_order, name, id) {
        (None, None, None) => Ok(None),
        (Some(sort_order), Some(name), Some(id)) if !name.trim().is_empty() && id > 0 => {
            Ok(Some((sort_order, name, id)))
        }
        (Some(_), Some(_), Some(id)) if id <= 0 => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must be positive",
        ))),
        (Some(_), Some(_), Some(_)) => Err(AsterError::validation_error(format!(
            "{value_name} cursor name must not be empty",
        ))),
        _ => Err(AsterError::validation_error(format!(
            "{value_name} cursor requires sort_order, name, and id",
        ))),
    }
}

pub fn parse_enabled_priority_id_cursor(
    enabled: Option<bool>,
    priority: Option<i32>,
    id: Option<i64>,
    value_name: &str,
) -> Result<Option<(bool, i32, i64)>> {
    match (enabled, priority, id) {
        (None, None, None) => Ok(None),
        (Some(enabled), Some(priority), Some(id)) if id > 0 => Ok(Some((enabled, priority, id))),
        (Some(_), Some(_), Some(_)) => Err(AsterError::validation_error(format!(
            "{value_name} cursor id must be positive",
        ))),
        _ => Err(AsterError::validation_error(format!(
            "{value_name} cursor requires enabled, priority, and id",
        ))),
    }
}

#[derive(Debug, Clone)]
pub struct CursorSlice<T> {
    pub items: Vec<T>,
    pub total: u64,
    pub has_more: bool,
}

impl<T> CursorSlice<T> {
    pub fn empty(total: u64) -> Self {
        Self {
            items: Vec::new(),
            total,
            has_more: false,
        }
    }

    pub fn from_overfetch(
        mut items: Vec<T>,
        total: u64,
        limit: u64,
        size_name: &'static str,
        limit_name: &'static str,
    ) -> Result<Self> {
        let has_more = crate::utils::numbers::usize_to_u64(items.len(), size_name)? > limit;
        if has_more {
            items.truncate(crate::utils::numbers::u64_to_usize(limit, limit_name)?);
        }
        Ok(Self {
            items,
            total,
            has_more,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    #[default]
    Asc,
    Desc,
}

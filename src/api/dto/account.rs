//! Current-user account DTOs.

use serde::Deserialize;
use serde::Serialize;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::{IntoParams, ToSchema};

use crate::services::audit_service::AuditLogEntry;
use crate::types::AuditEntityType;

#[derive(Debug, Clone, Serialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
pub struct AccountOverviewResp {
    pub profile_count: u64,
    pub recent_activity: Vec<AuditLogEntry>,
}

#[derive(Debug, Deserialize)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(IntoParams, ToSchema)
)]
pub struct AccountAuditLogFilterQuery {
    pub action: Option<String>,
    pub entity_type: Option<AuditEntityType>,
    pub entity_id: Option<i64>,
    pub after: Option<String>,
    pub before: Option<String>,
}

impl AccountAuditLogFilterQuery {
    pub fn into_filters_for_user(
        self,
        user_id: i64,
    ) -> crate::services::audit_service::AuditLogFilters {
        crate::services::audit_service::AuditLogFilters::from_query(
            &crate::services::audit_service::AuditLogFilterQuery {
                user_id: Some(user_id),
                action: self.action,
                entity_type: self.entity_type,
                entity_id: self.entity_id,
                after: self.after,
                before: self.before,
            },
        )
    }
}

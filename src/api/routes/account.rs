//! Current-user account routes.

use crate::api::dto::{AccountAuditLogFilterQuery, AccountOverviewResp};
use crate::api::pagination::{AuditLogSortBy, LimitOffsetQuery, OffsetPage, SortOrder};
use crate::api::response::ApiResponse;
use crate::db::repository::user_repo;
use crate::errors::Result;
use crate::runtime::AppState;
use crate::services::{audit_service, auth_service};
use actix_web::{HttpRequest, HttpResponse, web};

const ACCOUNT_OVERVIEW_ACTIVITY_LIMIT: u64 = 5;
const ACCOUNT_AUDIT_LOG_DEFAULT_LIMIT: u64 = 30;
const ACCOUNT_AUDIT_LOG_MAX_LIMIT: u64 = 100;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/account")
            .route("/overview", web::get().to(overview))
            .route("/audit-logs", web::get().to(list_audit_logs)),
    );
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/account/overview",
    tag = "account",
    operation_id = "get_account_overview",
    responses(
        (status = 200, description = "Current account overview", body = inline(ApiResponse<AccountOverviewResp>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer" = [])),
)]
pub async fn overview(state: web::Data<AppState>, req: HttpRequest) -> Result<HttpResponse> {
    let user = auth_service::current_user(state.get_ref(), &req).await?;
    tracing::debug!(user_id = user.id, "account overview request received");
    let profile_count = user_repo::count_profiles_by_user_ids(state.reader_db(), &[user.id])
        .await?
        .get(&user.id)
        .copied()
        .unwrap_or(0);
    let recent_activity = query_current_user_audit_logs(
        state.get_ref(),
        user.id,
        audit_service::AuditLogFilters {
            user_id: Some(user.id),
            action: None,
            entity_type: None,
            entity_id: None,
            after: None,
            before: None,
        },
        ACCOUNT_OVERVIEW_ACTIVITY_LIMIT,
        0,
        AuditLogSortBy::CreatedAt,
        SortOrder::Desc,
    )
    .await?
    .items;
    tracing::debug!(
        user_id = user.id,
        activity_count = recent_activity.len(),
        "account overview request completed"
    );
    Ok(
        HttpResponse::Ok().json(ApiResponse::ok(AccountOverviewResp {
            profile_count,
            recent_activity,
        })),
    )
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/account/audit-logs",
    tag = "account",
    operation_id = "list_account_audit_logs",
    params(LimitOffsetQuery, AccountAuditLogFilterQuery, audit_service::AuditLogSortQuery),
    responses(
        (status = 200, description = "Current user's audit log entries", body = inline(ApiResponse<OffsetPage<audit_service::AuditLogEntry>>)),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer" = [])),
)]
pub async fn list_audit_logs(
    state: web::Data<AppState>,
    req: HttpRequest,
    page: web::Query<LimitOffsetQuery>,
    query: web::Query<AccountAuditLogFilterQuery>,
    sort: web::Query<audit_service::AuditLogSortQuery>,
) -> Result<HttpResponse> {
    let user = auth_service::current_user(state.get_ref(), &req).await?;
    tracing::debug!(user_id = user.id, "account audit log list request received");
    let filters = query.into_inner().into_filters_for_user(user.id);
    let page = query_current_user_audit_logs(
        state.get_ref(),
        user.id,
        filters,
        page.limit_or(ACCOUNT_AUDIT_LOG_DEFAULT_LIMIT, ACCOUNT_AUDIT_LOG_MAX_LIMIT),
        page.offset(),
        sort.sort_by(),
        sort.sort_order(),
    )
    .await?;
    tracing::debug!(
        user_id = user.id,
        count = page.items.len(),
        total = page.total,
        "account audit log list request completed"
    );
    Ok(HttpResponse::Ok().json(ApiResponse::ok(page)))
}

async fn query_current_user_audit_logs(
    state: &AppState,
    user_id: i64,
    mut filters: audit_service::AuditLogFilters,
    limit: u64,
    offset: u64,
    sort_by: AuditLogSortBy,
    sort_order: SortOrder,
) -> Result<OffsetPage<audit_service::AuditLogEntry>> {
    // Keep the current-user boundary server-side even if a future query type grows fields.
    filters.user_id = Some(user_id);
    audit_service::query(state, filters, limit, offset, sort_by, sort_order).await
}

//! Administrator texture library routes.

use actix_web::{HttpRequest, HttpResponse, web};
use serde::{Deserialize, Deserializer};
use validator::Validate;

use crate::api::dto::textures::{
    CreateMinecraftTextureTagReq, HandleTextureReportReq, ReviewTextureLibraryTextureReq,
    UpdateMinecraftTextureTagReq,
};
use crate::api::dto::validation::validate_request;
use crate::api::pagination::{LimitOffsetQuery, OffsetPage};
use crate::api::response::ApiResponse;
use crate::db::repository::{
    minecraft_texture_repo::AdminTextureLibraryListFilter,
    minecraft_texture_report_repo::AdminTextureReportListFilter,
};
use crate::errors::Result;
use crate::runtime::AppState;
use crate::services::{audit_service, auth_service, texture_service};
use crate::types::{
    MinecraftTextureLibraryStatus, MinecraftTextureReportReason, MinecraftTextureReportStatus,
    MinecraftTextureType, MinecraftTextureVisibility, TextureTagSearchMethod,
};

#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(utoipa::IntoParams, utoipa::ToSchema)
)]
pub struct AdminTextureLibraryTextureQuery {
    #[validate(length(max = 96, message = "keyword must not exceed 96 characters"))]
    pub keyword: Option<String>,
    pub texture_type: Option<MinecraftTextureType>,
    pub visibility: Option<MinecraftTextureVisibility>,
    pub library_status: Option<MinecraftTextureLibraryStatus>,
    pub published: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_tag_id_sequence")]
    #[validate(length(max = 16, message = "tag_ids must not contain more than 16 items"))]
    pub tag_ids: Vec<i64>,
    #[serde(default)]
    pub tag_search_method: TextureTagSearchMethod,
}

#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[cfg_attr(
    all(debug_assertions, feature = "openapi"),
    derive(utoipa::IntoParams, utoipa::ToSchema)
)]
pub struct AdminTextureReportQuery {
    pub status: Option<MinecraftTextureReportStatus>,
    pub reason: Option<MinecraftTextureReportReason>,
    #[validate(range(min = 1, message = "texture_id must be positive"))]
    pub texture_id: Option<i64>,
}

fn deserialize_tag_id_sequence<'de, D>(deserializer: D) -> std::result::Result<Vec<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw = Option::<String>::deserialize(deserializer)?;
    let Some(raw) = raw else {
        return Ok(Vec::new());
    };
    raw.split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            value.parse::<i64>().map_err(|_| {
                serde::de::Error::custom("tag_ids must be a comma-separated integer sequence")
            })
        })
        .collect()
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/admin/texture-library/reports",
    tag = "admin",
    operation_id = "admin_list_texture_library_reports",
    params(LimitOffsetQuery, AdminTextureReportQuery),
    responses(
        (status = 200, description = "Texture library reports", body = inline(ApiResponse<OffsetPage<texture_service::TextureReportInfo>>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer" = [])),
)]
pub async fn list_texture_library_reports(
    state: web::Data<AppState>,
    page: web::Query<LimitOffsetQuery>,
    query: web::Query<AdminTextureReportQuery>,
) -> Result<HttpResponse> {
    validate_request(&*query)?;
    let reports = texture_service::list_admin_texture_library_reports_paginated(
        state.get_ref(),
        page.limit_or(50, 100),
        page.offset(),
        AdminTextureReportListFilter {
            status: query.status,
            reason: query.reason,
            texture_id: query.texture_id,
        },
    )
    .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(reports)))
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/admin/texture-library/reports/{report_id}",
    tag = "admin",
    operation_id = "admin_get_texture_library_report",
    params(("report_id" = i64, Path, description = "Texture report ID")),
    responses(
        (status = 200, description = "Texture library report detail", body = inline(ApiResponse<texture_service::TextureReportInfo>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Report not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn get_texture_library_report(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse> {
    let report =
        texture_service::get_admin_texture_library_report(state.get_ref(), path.into_inner())
            .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(report)))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/reports/{report_id}/accept",
    tag = "admin",
    operation_id = "admin_accept_texture_library_report",
    request_body = HandleTextureReportReq,
    params(("report_id" = i64, Path, description = "Texture report ID")),
    responses(
        (status = 200, description = "Accepted texture report", body = inline(ApiResponse<texture_service::TextureReportInfo>)),
        (status = 400, description = "Invalid report state"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Report not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn accept_texture_library_report(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<HandleTextureReportReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let handler = auth_service::current_user(state.get_ref(), &req).await?;
    let report = texture_service::accept_texture_library_report(
        state.get_ref(),
        handler.id,
        path.into_inner(),
        body.admin_note.clone(),
    )
    .await?;
    log_texture_report_audit(
        state.get_ref(),
        &req,
        handler.id,
        audit_service::AuditAction::MinecraftTextureReportAccept,
        &report,
    )
    .await;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(report)))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/reports/{report_id}/reject",
    tag = "admin",
    operation_id = "admin_reject_texture_library_report",
    request_body = HandleTextureReportReq,
    params(("report_id" = i64, Path, description = "Texture report ID")),
    responses(
        (status = 200, description = "Rejected texture report", body = inline(ApiResponse<texture_service::TextureReportInfo>)),
        (status = 400, description = "Invalid report state"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Report not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn reject_texture_library_report(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<HandleTextureReportReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let handler = auth_service::current_user(state.get_ref(), &req).await?;
    let report = texture_service::reject_texture_library_report(
        state.get_ref(),
        handler.id,
        path.into_inner(),
        body.admin_note.clone(),
    )
    .await?;
    log_texture_report_audit(
        state.get_ref(),
        &req,
        handler.id,
        audit_service::AuditAction::MinecraftTextureReportReject,
        &report,
    )
    .await;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(report)))
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/admin/texture-library/textures",
    tag = "admin",
    operation_id = "admin_list_texture_library_textures",
    params(LimitOffsetQuery, AdminTextureLibraryTextureQuery),
    responses(
        (status = 200, description = "Texture library moderation textures", body = inline(ApiResponse<OffsetPage<texture_service::PublicTextureLibraryTextureMetadata>>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer" = [])),
)]
pub async fn list_texture_library_textures(
    state: web::Data<AppState>,
    page: web::Query<LimitOffsetQuery>,
    query: web::Query<AdminTextureLibraryTextureQuery>,
) -> Result<HttpResponse> {
    validate_request(&*query)?;
    let limit = page.limit_or(50, 100);
    let offset = page.offset();
    let keyword = query
        .keyword
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let page = texture_service::list_admin_texture_library_textures_paginated(
        state.get_ref(),
        limit,
        offset,
        AdminTextureLibraryListFilter {
            texture_type: query.texture_type,
            visibility: query.visibility,
            library_status: query.library_status,
            published: query.published,
            tag_ids: query.tag_ids.clone(),
            tag_search_method: query.tag_search_method,
            keyword,
        },
    )
    .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(page)))
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/admin/texture-library/textures/{texture_id}",
    tag = "admin",
    operation_id = "admin_get_texture_library_texture",
    params(("texture_id" = i64, Path, description = "Texture ID")),
    responses(
        (status = 200, description = "Texture library moderation texture", body = inline(ApiResponse<texture_service::PublicTextureLibraryTextureMetadata>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Texture not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn get_texture_library_texture(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse> {
    let texture =
        texture_service::get_admin_texture_library_texture(state.get_ref(), path.into_inner())
            .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(texture)))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/textures/{texture_id}/approve",
    tag = "admin",
    operation_id = "admin_approve_texture_library_texture",
    request_body = ReviewTextureLibraryTextureReq,
    params(("texture_id" = i64, Path, description = "Texture ID")),
    responses(
        (status = 200, description = "Approved texture", body = inline(ApiResponse<texture_service::PublicTextureLibraryTextureMetadata>)),
        (status = 400, description = "Invalid texture state"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Texture not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn approve_texture_library_texture(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<ReviewTextureLibraryTextureReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let reviewer = auth_service::current_user(state.get_ref(), &req).await?;
    let texture = texture_service::approve_texture_library_texture(
        state.get_ref(),
        reviewer.id,
        path.into_inner(),
        body.review_note.clone(),
        body.tag_ids.as_deref(),
    )
    .await?;
    log_texture_library_review_audit(
        state.get_ref(),
        &req,
        reviewer.id,
        audit_service::AuditAction::MinecraftTextureLibraryApprove,
        &texture,
    )
    .await;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(texture)))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/textures/{texture_id}/reject",
    tag = "admin",
    operation_id = "admin_reject_texture_library_texture",
    request_body = ReviewTextureLibraryTextureReq,
    params(("texture_id" = i64, Path, description = "Texture ID")),
    responses(
        (status = 200, description = "Rejected texture", body = inline(ApiResponse<texture_service::PublicTextureLibraryTextureMetadata>)),
        (status = 400, description = "Invalid texture state or review note"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Texture not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn reject_texture_library_texture(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<ReviewTextureLibraryTextureReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let reviewer = auth_service::current_user(state.get_ref(), &req).await?;
    let texture = texture_service::reject_texture_library_texture(
        state.get_ref(),
        reviewer.id,
        path.into_inner(),
        body.review_note.clone(),
    )
    .await?;
    log_texture_library_review_audit(
        state.get_ref(),
        &req,
        reviewer.id,
        audit_service::AuditAction::MinecraftTextureLibraryReject,
        &texture,
    )
    .await;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(texture)))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/textures/{texture_id}/unpublish",
    tag = "admin",
    operation_id = "admin_unpublish_texture_library_texture",
    request_body = ReviewTextureLibraryTextureReq,
    params(("texture_id" = i64, Path, description = "Texture ID")),
    responses(
        (status = 200, description = "Unpublished texture", body = inline(ApiResponse<texture_service::PublicTextureLibraryTextureMetadata>)),
        (status = 400, description = "Invalid texture state"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Texture not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn unpublish_texture_library_texture(
    state: web::Data<AppState>,
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<ReviewTextureLibraryTextureReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let reviewer = auth_service::current_user(state.get_ref(), &req).await?;
    let texture = texture_service::unpublish_texture_library_texture(
        state.get_ref(),
        reviewer.id,
        path.into_inner(),
        body.review_note.clone(),
    )
    .await?;
    log_texture_library_review_audit(
        state.get_ref(),
        &req,
        reviewer.id,
        audit_service::AuditAction::MinecraftTextureLibraryUnpublish,
        &texture,
    )
    .await;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(texture)))
}

async fn log_texture_library_review_audit(
    state: &AppState,
    req: &HttpRequest,
    reviewer_user_id: i64,
    action: audit_service::AuditAction,
    texture: &texture_service::PublicTextureLibraryTextureMetadata,
) {
    let ctx = audit_service::AuditContext::from_request(req, reviewer_user_id);
    audit_service::log_with_details(
        state,
        &ctx,
        action,
        audit_service::AuditEntityType::MinecraftTexture,
        Some(texture.id),
        Some(&texture.name),
        || {
            audit_service::details(audit_service::MinecraftTextureAuditDetails {
                profile_uuid: "",
                profile_name: "",
                texture_type: texture.texture_type,
                texture_hash: Some(&texture.hash),
                texture_model: Some(texture.texture_model),
                width: Some(texture.width),
                height: Some(texture.height),
                file_size: Some(texture.file_size),
                library_status: Some(texture.library_status),
                review_note: texture.library_review_note.as_deref(),
            })
        },
    )
    .await;
}

async fn log_texture_report_audit(
    state: &AppState,
    req: &HttpRequest,
    actor_user_id: i64,
    action: audit_service::AuditAction,
    report: &texture_service::TextureReportInfo,
) {
    let ctx = audit_service::AuditContext::from_request(req, actor_user_id);
    audit_service::log_with_details(
        state,
        &ctx,
        action,
        audit_service::AuditEntityType::MinecraftTexture,
        Some(report.texture_id),
        report.texture.as_ref().map(|texture| texture.name.as_str()),
        || {
            audit_service::details(audit_service::MinecraftTextureReportAuditDetails {
                texture_id: report.texture_id,
                report_id: report.id,
                reason: report.reason,
                report_status: report.status,
                library_status: report
                    .texture
                    .as_ref()
                    .map(|texture| texture.library_status),
            })
        },
    )
    .await;
}

#[api_docs_macros::path(
    get,
    path = "/api/v1/admin/texture-library/tags",
    tag = "admin",
    operation_id = "admin_list_texture_library_tags",
    params(LimitOffsetQuery),
    responses(
        (status = 200, description = "Texture library tags", body = inline(ApiResponse<OffsetPage<texture_service::MinecraftTextureTagInfo>>)),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer" = [])),
)]
pub async fn list_texture_library_tags(
    state: web::Data<AppState>,
    page: web::Query<LimitOffsetQuery>,
) -> Result<HttpResponse> {
    let limit = page.limit_or(50, 100);
    let offset = page.offset();
    let tags = texture_service::list_texture_library_tags(state.get_ref()).await?;
    let total = crate::utils::numbers::usize_to_u64(tags.len(), "texture library tag count")?;
    let start = usize::try_from(offset).unwrap_or(usize::MAX);
    let limit_usize = usize::try_from(limit).unwrap_or(usize::MAX);
    let items = tags
        .into_iter()
        .skip(start)
        .take(limit_usize)
        .collect::<Vec<_>>();
    Ok(HttpResponse::Ok().json(ApiResponse::ok(OffsetPage::new(
        items, total, limit, offset,
    ))))
}

#[api_docs_macros::path(
    post,
    path = "/api/v1/admin/texture-library/tags",
    tag = "admin",
    operation_id = "admin_create_texture_library_tag",
    request_body = CreateMinecraftTextureTagReq,
    responses(
        (status = 200, description = "Created texture library tag", body = inline(ApiResponse<texture_service::MinecraftTextureTagInfo>)),
        (status = 400, description = "Invalid or duplicate tag"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
    ),
    security(("bearer" = [])),
)]
pub async fn create_texture_library_tag(
    state: web::Data<AppState>,
    body: web::Json<CreateMinecraftTextureTagReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let tag = texture_service::create_texture_library_tag(
        state.get_ref(),
        &body.name,
        &body.color,
        body.sort_order,
    )
    .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(tag)))
}

#[api_docs_macros::path(
    patch,
    path = "/api/v1/admin/texture-library/tags/{tag_id}",
    tag = "admin",
    operation_id = "admin_update_texture_library_tag",
    request_body = UpdateMinecraftTextureTagReq,
    params(("tag_id" = i64, Path, description = "Texture library tag ID")),
    responses(
        (status = 200, description = "Updated texture library tag", body = inline(ApiResponse<texture_service::MinecraftTextureTagInfo>)),
        (status = 400, description = "Invalid or duplicate tag"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Tag not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn update_texture_library_tag(
    state: web::Data<AppState>,
    path: web::Path<i64>,
    body: web::Json<UpdateMinecraftTextureTagReq>,
) -> Result<HttpResponse> {
    validate_request(&*body)?;
    let tag = texture_service::update_texture_library_tag(
        state.get_ref(),
        path.into_inner(),
        body.name.as_deref(),
        body.color.as_deref(),
        body.sort_order,
    )
    .await?;
    Ok(HttpResponse::Ok().json(ApiResponse::ok(tag)))
}

#[api_docs_macros::path(
    delete,
    path = "/api/v1/admin/texture-library/tags/{tag_id}",
    tag = "admin",
    operation_id = "admin_delete_texture_library_tag",
    params(("tag_id" = i64, Path, description = "Texture library tag ID")),
    responses(
        (status = 204, description = "Deleted texture library tag"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Tag not found"),
    ),
    security(("bearer" = [])),
)]
pub async fn delete_texture_library_tag(
    state: web::Data<AppState>,
    path: web::Path<i64>,
) -> Result<HttpResponse> {
    texture_service::delete_texture_library_tag(state.get_ref(), path.into_inner()).await?;
    Ok(HttpResponse::NoContent().finish())
}

// Re-export generated types for convenience
// IMPORTANT: Agent code should import from this file instead of api.generated.ts to avoid coupling to the codegen tool and to allow manual additions of types as needed.
// It is strictly prohibited to directly add new fields in this document.
import type {
	operations as ApiOperations,
	components,
} from "@/types/api.generated";

export type { operations, paths } from "@/types/api.generated";

type OperationJsonContent<
	Operation extends keyof ApiOperations,
	Status extends
		keyof OperationResponses<Operation> = 200 extends keyof OperationResponses<Operation>
		? 200
		: keyof OperationResponses<Operation>,
> = OperationResponses<Operation>[Status] extends {
	content: {
		"application/json": infer Body;
	};
}
	? NonNullable<Body>
	: never;

type OperationResponses<Operation extends keyof ApiOperations> =
	ApiOperations[Operation] extends { responses: infer Responses }
		? Responses
		: never;

export type OperationJsonResponse<
	Operation extends keyof ApiOperations,
	Status extends
		keyof OperationResponses<Operation> = 200 extends keyof OperationResponses<Operation>
		? 200
		: keyof OperationResponses<Operation>,
> = OperationJsonContent<Operation, Status>;

export type OperationData<
	Operation extends keyof ApiOperations,
	Status extends
		keyof OperationResponses<Operation> = 200 extends keyof OperationResponses<Operation>
		? 200
		: keyof OperationResponses<Operation>,
> =
	OperationJsonResponse<Operation, Status> extends { data?: infer Data }
		? NonNullable<Data>
		: never;

export type OperationQuery<Operation extends keyof ApiOperations> =
	ApiOperations[Operation] extends { parameters: { query?: infer Query } }
		? NonNullable<Query>
		: never;

export type OperationPath<Operation extends keyof ApiOperations> =
	ApiOperations[Operation] extends { parameters: { path: infer Path } }
		? NonNullable<Path>
		: never;

export type OperationRequestBody<Operation extends keyof ApiOperations> =
	ApiOperations[Operation] extends {
		requestBody: {
			content: {
				"application/json": infer Body;
			};
		};
	}
		? NonNullable<Body>
		: never;

export type AsterErrorCode = components["schemas"]["AsterErrorCode"];
export type ApiErrorInfo = components["schemas"]["ApiErrorInfo"];
export type AvatarInfo = components["schemas"]["AvatarInfo"];
export type AvatarSource = components["schemas"]["AvatarSource"];

export type ApiResponse<T = unknown> = {
	code: AsterErrorCode;
	msg: string;
	data?: T | null;
	error?: ApiErrorInfo | null;
};

export type PublicBranding = components["schemas"]["PublicBranding"];
export type PublicYggdrasilConfig =
	components["schemas"]["PublicYggdrasilConfig"];
export type PublicFrontendConfig =
	components["schemas"]["PublicFrontendConfig"];

export type AdminAuditLogSortBy = components["schemas"]["AdminAuditLogSortBy"];
export type AdminAuditLogQuery = OperationQuery<"list_audit_logs">;
export type AuditAction = components["schemas"]["AuditAction"];
export type AuditEntityType = components["schemas"]["AuditEntityType"];
export type AuditLogEntry = components["schemas"]["AuditLogEntry"];
export type AuditLogPage = components["schemas"]["OffsetPage_AuditLogEntry"];
export type AuditPresentation = components["schemas"]["AuditPresentation"];
export type AuditPresentationMessage =
	components["schemas"]["AuditPresentationMessage"];
export type AuthTokenResponse = components["schemas"]["AuthTokenResponse"];
export type AuthUserInfo = components["schemas"]["AuthUserInfo"];
export type AdminUserInfo = components["schemas"]["AdminUserInfo"];
export type AdminUserListQuery = OperationQuery<"admin_list_users">;
export type AdminUserPage = components["schemas"]["OffsetPage_AdminUserInfo"];
export type AdminUserSortBy = components["schemas"]["AdminUserSortBy"];
export type AdminMinecraftProfileInfo =
	components["schemas"]["MinecraftProfileInfo"];
export type AdminMinecraftProfilePage =
	components["schemas"]["OffsetPage_MinecraftProfileInfo"];
export type CreateAdminUserRequest =
	components["schemas"]["CreateAdminUserReq"];
export type UpdateAdminUserRequest =
	components["schemas"]["UpdateAdminUserReq"];
export type AdminExternalAuthProviderInfo =
	components["schemas"]["AdminExternalAuthProviderInfo"];
export type AdminExternalAuthProviderPage =
	components["schemas"]["OffsetPage_AdminExternalAuthProviderInfo"];
export type AdminExternalAuthProviderListQuery =
	OperationQuery<"admin_list_external_auth_providers">;
export type AdminTaskCleanupRequest =
	components["schemas"]["AdminTaskCleanupReq"];
export type AdminTaskListQuery = OperationQuery<"admin_list_tasks">;
export type AdminTaskSortBy = components["schemas"]["AdminTaskSortBy"];
export type AdminTaskPage = components["schemas"]["OffsetPage_TaskInfo"];
export type BackgroundTaskKind = components["schemas"]["BackgroundTaskKind"];
export type BackgroundTaskStatus =
	components["schemas"]["BackgroundTaskStatus"];
export type CheckResp = components["schemas"]["CheckResp"];
export type ConfigSchemaItem = components["schemas"]["ConfigSchemaItem"];
export type ConfigListQuery = OperationQuery<"list_config">;
export type CreateExternalAuthProviderRequest =
	components["schemas"]["CreateExternalAuthProviderReq"];
export type ExternalAuthProviderKindInfo =
	components["schemas"]["ExternalAuthProviderKindInfo"];
export type ExternalAuthProviderTestParamsRequest =
	components["schemas"]["ExternalAuthProviderTestParamsReq"];
export type ExternalAuthProviderTestResult =
	components["schemas"]["ExternalAuthProviderTestResult"];
export type ExternalAuthKind =
	components["schemas"]["ExternalAuthProviderKind"];
export type ExternalAuthPublicProvider =
	components["schemas"]["ExternalAuthPublicProvider"];
export type ExternalAuthLinkInfo =
	OperationData<"auth_external_auth_list_links">[number];
export type ExternalAuthStartLoginRequest =
	components["schemas"]["StartExternalAuthReq"];
export type ExternalAuthStartLoginResponse =
	components["schemas"]["ExternalAuthStartLoginResponse"];
export type ExternalAuthFinishLoginResponse =
	components["schemas"]["ExternalAuthFinishLoginResponse"];
export type HealthResponse = components["schemas"]["HealthResponse"];
export type SystemInfoResponse = components["schemas"]["SystemInfoResponse"];
export type LoginRequest = components["schemas"]["LoginReq"];
export type LogoutRequest = components["schemas"]["LogoutReq"];
export type LogoutResponse = components["schemas"]["LogoutResp"];
export type MinecraftTextureModel =
	components["schemas"]["MinecraftTextureModel"];
export type MinecraftTextureMetadata =
	components["schemas"]["MinecraftTextureMetadata"];
export type MinecraftTextureType =
	components["schemas"]["MinecraftTextureType"];
export type MinecraftWardrobeTextureMetadata =
	components["schemas"]["MinecraftWardrobeTextureMetadata"];
export type CreateMinecraftProfileRequest =
	components["schemas"]["CreateMinecraftProfileReq"];
export type RefreshRequest = components["schemas"]["RefreshReq"];
export type RegisterRequest = components["schemas"]["RegisterReq"];
export type RemovedCountResponse =
	components["schemas"]["RemovedCountResponse"];
export type SetConfigRequest = components["schemas"]["SetConfigReq"];
export type SetupRequest = components["schemas"]["SetupReq"];
export type SortOrder = components["schemas"]["SortOrder"];
export type SystemConfig = components["schemas"]["SystemConfig"];
export type SystemConfigPage = components["schemas"]["OffsetPage_SystemConfig"];
export type SystemConfigValue = components["schemas"]["SystemConfigValue"];
export type SystemConfigVisibility =
	components["schemas"]["SystemConfigVisibility"];
export type TaskInfo = components["schemas"]["TaskInfo"];
export type TaskCreatorSummary = components["schemas"]["TaskCreatorSummary"];
export type TaskPresentation = components["schemas"]["TaskPresentation"];
export type TaskPresentationCode =
	components["schemas"]["TaskPresentationCode"];
export type TaskPresentationMessage =
	components["schemas"]["TaskPresentationMessage"];
export type TaskStepInfo = components["schemas"]["TaskStepInfo"];
export type TaskStepStatus = components["schemas"]["TaskStepStatus"];
export type UpdateExternalAuthProviderRequest =
	components["schemas"]["UpdateExternalAuthProviderReq"];
export type UpdateAvatarSourceRequest =
	components["schemas"]["UpdateAvatarSourceReq"];
export type UpdateProfileRequest = components["schemas"]["UpdateProfileReq"];
export type UserProfileInfo = components["schemas"]["UserProfileInfo"];
export type UserRole = components["schemas"]["UserRole"];
export type UserStatus = components["schemas"]["UserStatus"];
export type AuthSessionInfo = OperationData<"list_auth_sessions">[number];
export type RevokeOtherAuthSessionsResponse =
	OperationData<"revoke_other_auth_sessions">;
export type YggdrasilErrorBody = components["schemas"]["YggdrasilErrorBody"];
export type YggdrasilMetadata = OperationJsonResponse<"yggdrasil_metadata">;
export type YggdrasilProfile =
	OperationData<"list_current_user_minecraft_profiles">[number];
export type YggdrasilProfileProperty =
	components["schemas"]["YggdrasilProfileProperty"];
export type YggdrasilProfileByUuidQuery =
	OperationQuery<"yggdrasil_profile_by_uuid">;

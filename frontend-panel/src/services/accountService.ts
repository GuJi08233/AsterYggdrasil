import { withQuery } from "@/lib/query";
import type {
	AccountAuditLogPage,
	AccountAuditLogQuery,
	AccountOverview,
} from "@/types/api";
import { api } from "./http";

export const accountService = {
	overview: () => api.get<AccountOverview>("/account/overview"),
	listAuditLogs: (params: AccountAuditLogQuery = {}) =>
		api.get<AccountAuditLogPage>(
			withQuery("/account/audit-logs", {
				limit: params.limit,
				offset: params.offset,
				action: params.action,
				entity_type: params.entity_type,
				entity_id: params.entity_id,
				after: params.after,
				before: params.before,
				sort_by: params.sort_by ?? "created_at",
				sort_order: params.sort_order ?? "desc",
			}),
		),
};

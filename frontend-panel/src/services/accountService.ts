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
				action: params.action,
				entity_type: params.entity_type,
				entity_id: params.entity_id,
				after: params.after,
				before: params.before,
				after_created_at: params.after_created_at,
				after_id: params.after_id,
			}),
		),
};

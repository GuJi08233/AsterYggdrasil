import { useCallback } from "react";
import { AuditLogPage } from "@/components/audit/AuditLogPage";
import { adminAuditService } from "@/services/adminService";

export default function AdminAuditPage() {
	const listAuditLogs = useCallback(
		(query: Parameters<typeof adminAuditService.list>[0]) =>
			adminAuditService.list(query),
		[],
	);

	return (
		<AuditLogPage
			list={listAuditLogs}
			showActor
			translationPrefix="admin.auditPage"
		/>
	);
}

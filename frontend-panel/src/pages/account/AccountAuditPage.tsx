import { useCallback } from "react";
import { AuditLogPage } from "@/components/audit/AuditLogPage";
import { accountService } from "@/services/accountService";

export default function AccountAuditPage() {
	const listAuditLogs = useCallback(
		(query: Parameters<typeof accountService.listAuditLogs>[0]) =>
			accountService.listAuditLogs(query),
		[],
	);

	return (
		<AuditLogPage
			list={listAuditLogs}
			showActor={false}
			translationPrefix="account.auditPage"
		/>
	);
}

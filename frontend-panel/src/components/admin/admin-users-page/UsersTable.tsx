import { useTranslation } from "react-i18next";
import {
	ADMIN_TABLE_MUTED_TEXT_CLASS,
	AdminSortableTableHead,
	AdminTableCell as TableCell,
	AdminTableHead as TableHead,
	AdminTableHeader as TableHeader,
	AdminTableRow as TableRow,
} from "@/components/common/AdminTable";
import { UserAvatarImage } from "@/components/common/UserAvatarImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/dateTime";
import { cn } from "@/lib/utils";
import type { AdminUserInfo, AdminUserSortBy } from "@/types/api";

type SortOrder = "asc" | "desc";

export function UsersTableHeader({
	onSortChange,
	sortBy,
	sortOrder,
}: {
	onSortChange: (sortBy: AdminUserSortBy, sortOrder: SortOrder) => void;
	sortBy: AdminUserSortBy;
	sortOrder: SortOrder;
}) {
	const { t } = useTranslation();

	return (
		<TableHeader>
			<TableRow>
				<AdminSortableTableHead
					sortKey="username"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
					className="min-w-[260px]"
				>
					{t("admin.users.table.account")}
				</AdminSortableTableHead>
				<AdminSortableTableHead
					sortKey="role"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
					className="w-32"
				>
					{t("admin.users.table.role")}
				</AdminSortableTableHead>
				<AdminSortableTableHead
					sortKey="status"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
					className="w-32"
				>
					{t("admin.users.table.status")}
				</AdminSortableTableHead>
				<TableHead className="w-44">
					{t("admin.users.table.activity")}
				</TableHead>
				<AdminSortableTableHead
					sortKey="updated_at"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
					className="w-44"
				>
					{t("admin.users.table.updated")}
				</AdminSortableTableHead>
				<TableHead className="w-32 text-right">
					{t("admin.users.table.actions")}
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}

export function UsersTableRow({
	onEdit,
	onRevokeSessions,
	revokingId,
	user,
}: {
	onEdit: (user: AdminUserInfo) => void;
	onRevokeSessions: (user: AdminUserInfo) => void;
	revokingId: number | null;
	user: AdminUserInfo;
}) {
	const { t } = useTranslation();
	const revoking = revokingId === user.id;

	return (
		<TableRow
			className="cursor-pointer"
			tabIndex={0}
			onClick={() => onEdit(user)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onEdit(user);
				}
			}}
		>
			<TableCell>
				<div className="flex min-w-0 items-center gap-3">
					<UserAvatarImage
						name={user.username}
						size="sm"
						className="rounded-lg"
					/>
					<div className="min-w-0">
						<div className="truncate font-medium">{user.username}</div>
						<div className={cn("mt-1 truncate", ADMIN_TABLE_MUTED_TEXT_CLASS)}>
							{user.email}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<RoleBadge userRole={user.role} />
			</TableCell>
			<TableCell>
				<StatusBadge status={user.status} />
			</TableCell>
			<TableCell>
				<div className="space-y-1 text-sm">
					<div>
						{t("admin.users.profileCount", { count: user.profile_count })}
					</div>
					<div className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
						{t("admin.users.activeSessionCount", {
							count: user.active_session_count,
						})}
					</div>
				</div>
			</TableCell>
			<TableCell>
				<div className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
					{formatDateTime(user.updated_at)}
				</div>
			</TableCell>
			<TableCell
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<div className="flex justify-end gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => onEdit(user)}
						aria-label={t("admin.users.edit")}
						title={t("admin.users.edit")}
					>
						<Icon name="PencilSimple" className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={revoking || user.active_session_count === 0}
						onClick={() => onRevokeSessions(user)}
						aria-label={t("admin.users.revokeSessions")}
						title={t("admin.users.revokeSessions")}
					>
						<Icon
							name={revoking ? "Spinner" : "Key"}
							className={cn("size-4", revoking && "animate-spin")}
						/>
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

export function RoleBadge({ userRole }: { userRole: AdminUserInfo["role"] }) {
	const { t } = useTranslation();
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-md",
				userRole === "admin"
					? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
					: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
			)}
		>
			{userRole === "admin"
				? t("admin.users.role.admin")
				: t("admin.users.role.user")}
		</Badge>
	);
}

export function StatusBadge({ status }: { status: AdminUserInfo["status"] }) {
	const { t } = useTranslation();
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-md",
				status === "active"
					? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
					: "border-destructive/30 bg-destructive/10 text-destructive",
			)}
		>
			{status === "active"
				? t("admin.users.status.active")
				: t("admin.users.status.disabled")}
		</Badge>
	);
}

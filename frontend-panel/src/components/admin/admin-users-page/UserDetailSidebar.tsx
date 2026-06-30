import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DateTimeText } from "@/components/common/DateTimeText";
import { UserAvatarImage } from "@/components/common/UserAvatarImage";
import { getNormalizedDisplayName, getUserDisplayName } from "@/lib/user";
import { cn } from "@/lib/utils";
import type { AdminUserInfo } from "@/types/api";
import { RoleBadge, StatusBadge } from "./UsersTable";

export function UserDetailSidebar({ user }: { user: AdminUserInfo }) {
	const { t } = useTranslation();
	const displayName = getUserDisplayName(user);
	const showUsernameSecondary =
		getNormalizedDisplayName(user.profile.display_name) != null &&
		displayName !== user.username;
	const emailLabel = user.email ?? t("admin.users.noEmail");
	const secondaryLabel = showUsernameSecondary
		? `@${user.username} · ${emailLabel}`
		: emailLabel;
	return (
		<aside className="border-b border-border/70 bg-muted/20 lg:border-r lg:border-b-0 dark:border-white/10">
			<div className="space-y-5 p-5">
				<div className="flex items-start gap-3">
					<UserAvatarImage
						name={displayName}
						avatar={user.profile.avatar}
						size="lg"
						className="size-16 rounded-xl text-xl"
					/>
					<div className="min-w-0 flex-1 space-y-3">
						<div className="space-y-1">
							<h3 className="break-words text-lg font-semibold text-foreground">
								{displayName}
							</h3>
							<p className="break-all text-sm text-muted-foreground">
								{secondaryLabel}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<RoleBadge userRole={user.role} />
							<StatusBadge status={user.status} />
						</div>
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
					<SidebarMetric label="ID" value={String(user.id)} mono />
					<SidebarMetric
						label={t("admin.users.profileCountLabel")}
						value={String(user.profile_count)}
					/>
					<SidebarMetric
						label={t("admin.users.activeSessionCountLabel")}
						value={String(user.active_session_count)}
					/>
					<SidebarMetric
						label={t("admin.users.createdAt")}
						value={<DateTimeText value={user.created_at} />}
					/>
					<SidebarMetric
						label={t("admin.users.updatedAt")}
						value={<DateTimeText value={user.updated_at} />}
					/>
				</div>
			</div>
		</aside>
	);
}

function SidebarMetric({
	label,
	mono,
	value,
}: {
	label: string;
	mono?: boolean;
	value: ReactNode;
}) {
	return (
		<div className="space-y-1 rounded-lg border border-border/70 bg-background/60 p-3 dark:border-white/10">
			<p className="text-muted-foreground text-xs uppercase">{label}</p>
			<p
				className={cn(
					"break-words text-foreground text-sm",
					mono && "font-mono",
				)}
			>
				{value}
			</p>
		</div>
	);
}

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AdminOffsetPagination } from "@/components/admin/AdminOffsetPagination";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MinecraftSkinAvatar } from "@/components/yggdrasil/MinecraftSkinAvatar";
import { adminMinecraftProfilePath, adminUserPath } from "@/routes/routePaths";

export type UserMinecraftProfileItem = {
	id: string;
	name: string;
	skinUrl: string | null;
};

export function UserDetailMinecraftSection({
	currentPage,
	loading,
	offset,
	onNext,
	onPageSizeChange,
	onPrevious,
	pageSize,
	pageSizeOptions,
	profiles,
	total,
	totalPages,
	userId,
}: {
	currentPage: number;
	loading: boolean;
	offset: number;
	onNext: () => void;
	onPageSizeChange: (value: string | null) => void;
	onPrevious: () => void;
	pageSize: number;
	pageSizeOptions: Array<{ label: string; value: string }>;
	profiles: UserMinecraftProfileItem[];
	total: number;
	totalPages: number;
	userId: number;
}) {
	const { t } = useTranslation();
	return (
		<section className="overflow-hidden rounded-lg border border-dashed border-border/70 bg-background/35 dark:border-white/10 dark:bg-input/5">
			<div className="p-4 pb-3">
				<h3 className="font-medium text-foreground">
					{t("admin.users.minecraftSection")}
				</h3>
				<p className="mt-1 text-sm leading-6 text-muted-foreground">
					{t("admin.users.minecraftSectionDescription")}
				</p>
				<div className="mt-4 grid gap-2">
					{loading ? (
						<p className="text-sm text-muted-foreground">
							{t("common.loading")}
						</p>
					) : profiles.length ? (
						profiles.map((profile) => (
							<div
								key={profile.id}
								className="flex min-w-0 flex-col items-stretch gap-3 rounded-lg border border-border/70 bg-background/55 px-3 py-2 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex min-w-0 max-w-full items-center gap-2.5">
									<MinecraftSkinAvatar
										name={profile.name}
										skinUrl={profile.skinUrl}
										testId={`admin-user-profile-avatar-${profile.id}`}
										imageTestId={`admin-user-profile-avatar-image-${profile.id}`}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{profile.name}
										</p>
										<p className="break-all font-mono text-xs text-muted-foreground">
											{profile.id}
										</p>
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full sm:w-auto"
									render={
										<Link
											to={adminMinecraftProfilePath(profile.id)}
											state={{ returnTo: adminUserPath(userId) }}
										/>
									}
								>
									<Icon name="ArrowRight" className="mr-2 size-4" />
									{t("admin.users.openProfile")}
								</Button>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">
							{t("admin.users.noMinecraftProfiles")}
						</p>
					)}
				</div>
			</div>
			<AdminOffsetPagination
				currentPage={currentPage}
				nextDisabled={loading || offset + pageSize >= total}
				pageSize={String(pageSize)}
				pageSizeOptions={pageSizeOptions}
				prevDisabled={loading || offset === 0}
				total={total}
				totalPages={totalPages}
				onNext={onNext}
				onPageSizeChange={onPageSizeChange}
				onPrevious={onPrevious}
			/>
		</section>
	);
}

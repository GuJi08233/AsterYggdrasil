import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type UserMinecraftProfileItem = {
	id: string;
	name: string;
};

export function UserDetailMinecraftSection({
	loading,
	profiles,
}: {
	loading: boolean;
	profiles: UserMinecraftProfileItem[];
}) {
	const { t } = useTranslation();
	return (
		<section className="rounded-lg border border-dashed border-border/70 bg-background/35 p-4 dark:border-white/10 dark:bg-input/5">
			<h3 className="font-medium text-foreground">
				{t("admin.users.minecraftSection")}
			</h3>
			<p className="mt-1 text-sm leading-6 text-muted-foreground">
				{t("admin.users.minecraftSectionDescription")}
			</p>
			<div className="mt-4 grid gap-2">
				{loading ? (
					<p className="text-sm text-muted-foreground">{t("common.loading")}</p>
				) : profiles.length ? (
					profiles.map((profile) => (
						<div
							key={profile.id}
							className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/55 px-3 py-2 dark:border-white/10"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-foreground">
									{profile.name}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{profile.id}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								render={
									<Link
										to={`/dashboard/admin/minecraft-profiles/${profile.id}`}
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
		</section>
	);
}

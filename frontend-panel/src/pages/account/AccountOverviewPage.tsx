import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import { LauncherSetupCard } from "@/components/yggdrasil/LauncherSetupCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { accountPaths, adminPaths } from "@/routes/routePaths";
import { authService } from "@/services/authService";
import { yggdrasilService } from "@/services/yggdrasilService";
import { useAuthStore } from "@/stores/authStore";
import type { AuthSessionInfo, YggdrasilProfile } from "@/types/api";

const actionItems = [
	{
		to: accountPaths.profiles,
		titleKey: "account.actionProfilesTitle",
		icon: "User",
	},
	{
		to: `${accountPaths.settings}#security`,
		titleKey: "account.actionSessionsTitle",
		icon: "Key",
	},
	{
		to: adminPaths.settings,
		titleKey: "account.actionAdminTitle",
		icon: "Shield",
		adminOnly: true,
	},
] as const;

export default function AccountOverviewPage() {
	const { t } = useTranslation();
	const user = useAuthStore((state) => state.user);
	const isAdmin = useAuthStore((state) => state.isAdmin);
	const [profiles, setProfiles] = useState<YggdrasilProfile[]>([]);
	const [sessions, setSessions] = useState<AuthSessionInfo[]>([]);

	usePageTitle(
		t("account.title", {
			username: user?.username ?? "Player",
		}),
	);

	useEffect(() => {
		void yggdrasilService
			.listProfiles()
			.then(setProfiles)
			.catch(() => undefined);
		void authService
			.sessions()
			.then(setSessions)
			.catch(() => undefined);
	}, []);

	const visibleActions = actionItems.filter(
		(item) => !("adminOnly" in item) || !item.adminOnly || isAdmin,
	);
	const latestSession = sessions[0];
	const hasLauncherProfile = profiles.length > 0;

	return (
		<div className="mx-auto grid w-full max-w-[96rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-7">
			<div className="min-w-0 space-y-5">
				<section className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
					<div
						className="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center opacity-90 md:block"
						style={{ backgroundImage: "url('/images/home.webp')" }}
					/>
					<div className="absolute inset-y-0 right-0 hidden w-2/3 bg-gradient-to-r from-card via-card/75 to-transparent dark:from-card dark:via-card/85 md:block" />
					<div className="relative max-w-2xl">
						<h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
							{t("account.welcome", {
								username: user?.username ?? "Player",
							})}
						</h1>
						<div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-400/25">
							<span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)] dark:bg-emerald-300 dark:shadow-[0_0_0_4px_rgba(110,231,183,0.16)]" />
							{t("account.systemNormal")}
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					<StatCard
						icon="User"
						label={t("account.profiles")}
						value={t("account.profilesValue", { count: profiles.length })}
						tone="green"
					/>
					<StatCard
						icon="Key"
						label={t("account.auth")}
						value={String(sessions.length)}
						tone="blue"
					/>
					<StatCard
						icon="Monitor"
						label={t("account.launcher")}
						value={
							hasLauncherProfile
								? t("account.launcherReady")
								: t("account.launcherNeedsProfile")
						}
						tone="violet"
					/>
				</section>

				<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
					<div className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold">
									{t("account.profileOverviewTitle")}
								</h2>
							</div>
							<Link
								to={accountPaths.profiles}
								className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
							>
								{t("account.viewAll")}
								<Icon name="ArrowRight" className="size-4" />
							</Link>
						</div>
						<div className="mt-5 grid gap-3">
							{profiles.length > 0 ? (
								profiles.slice(0, 4).map((profile) => (
									<div
										key={profile.id}
										className="flex items-center gap-3 rounded-lg border border-border/65 bg-muted/25 p-3 dark:border-white/10 dark:bg-muted/18"
									>
										<div className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
											<Icon name="User" className="size-5" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate font-semibold">
												{profile.name}
											</div>
											<div className="truncate text-xs text-muted-foreground">
												{profile.id}
											</div>
										</div>
									</div>
								))
							) : (
								<div className="rounded-lg border border-dashed border-border/80 bg-muted/25 p-5 text-sm text-muted-foreground dark:border-white/12 dark:bg-muted/18">
									{t("profiles.noProfilesDescription")}
								</div>
							)}
						</div>
					</div>

					<div className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold">
									{t("account.sessionOverviewTitle")}
								</h2>
							</div>
							<Icon
								name="Key"
								className="size-5 text-emerald-700 dark:text-emerald-300"
							/>
						</div>
						<div className="mt-5 rounded-lg bg-muted/35 p-4 dark:bg-muted/24">
							<div className="text-sm text-muted-foreground">
								{t("account.latestSession")}
							</div>
							<div className="mt-2 font-mono text-sm">
								{latestSession?.created_at
									? new Date(latestSession.created_at).toLocaleString()
									: t("account.noSession")}
							</div>
							<div className="mt-4 h-2 overflow-hidden rounded-full bg-border/70 dark:bg-border/50">
								<div
									className="h-full rounded-full bg-emerald-500 dark:bg-emerald-300"
									style={{
										width: `${Math.min(100, Math.max(12, sessions.length * 24))}%`,
									}}
								/>
							</div>
						</div>
					</div>
				</section>

				<LauncherSetupCard
					showProfileAction
					showServerOwner
					profileName={profiles[0]?.name ?? null}
				/>
			</div>

			<aside className="space-y-5">
				<LauncherStatusPanel
					hasProfile={hasLauncherProfile}
					sessionCount={sessions.length}
				/>
				<div className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
					<h2 className="text-lg font-semibold">{t("account.quickActions")}</h2>
					<div className="mt-4 grid gap-3">
						{visibleActions.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="group flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-white/10 dark:bg-muted/18 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/10"
							>
								<div className="grid size-9 place-items-center rounded-md bg-background text-emerald-700 shadow-xs dark:bg-input/30 dark:text-emerald-200 dark:shadow-none">
									<Icon name={item.icon} className="size-4" />
								</div>
								<div className="min-w-0">
									<div className="font-semibold">{t(item.titleKey)}</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</aside>
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	tone,
}: {
	icon: IconName;
	label: string;
	value: string;
	tone: "green" | "blue" | "violet";
}) {
	const toneClass = {
		green:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
		blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
		violet:
			"bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
	}[tone];
	return (
		<div className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
			<div className="flex items-center gap-4">
				<div
					className={cn(
						"grid size-11 place-items-center rounded-lg",
						toneClass,
					)}
				>
					<Icon name={icon} className="size-5" />
				</div>
				<div className="min-w-0">
					<div className="text-sm text-muted-foreground">{label}</div>
					<div className="mt-1 text-2xl font-semibold tracking-normal">
						{value}
					</div>
				</div>
			</div>
		</div>
	);
}

function LauncherStatusPanel({
	hasProfile,
	sessionCount,
}: {
	hasProfile: boolean;
	sessionCount: number;
}) {
	const { t } = useTranslation();
	const rows = [
		{
			id: "account",
			label: t("account.statusAccount"),
			value: t("account.statusSignedIn"),
			status: "ready",
		},
		{
			id: "profile",
			label: t("account.statusProfile"),
			value: hasProfile
				? t("account.statusProfileReady")
				: t("account.statusProfileMissing"),
			status: hasProfile ? "ready" : "pending",
		},
		{
			id: "session",
			label: t("account.statusSessions"),
			value: t("account.statusSessionCount", { count: sessionCount }),
			status: sessionCount > 0 ? "ready" : "pending",
		},
	] as const;

	return (
		<div className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">{t("account.statusTitle")}</h2>
				</div>
				<span className="mt-1 size-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.14)] dark:bg-emerald-300 dark:shadow-[0_0_0_5px_rgba(110,231,183,0.16)]" />
			</div>
			<div className="mt-5 space-y-3">
				{rows.map((row) => (
					<div key={row.id} className="flex items-center gap-3">
						<span
							className={cn(
								"size-2.5 rounded-full",
								row.status === "ready" ? "bg-emerald-500" : "bg-amber-400",
							)}
						/>
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-semibold">{row.label}</div>
						</div>
						<div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
							{row.value}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { UserAvatarImage } from "@/components/common/UserAvatarImage";
import { AppFooter } from "@/components/layout/AppFooter";
import { PublicEntryShell } from "@/components/layout/PublicEntryShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";

const featureKeys = [
	{
		id: "secure",
		icon: "Shield",
		title: "home.featureSecureTitle",
		description: "home.featureSecureDescription",
	},
	{
		id: "textures",
		icon: "FileImage",
		title: "home.featureTexturesTitle",
		description: "home.featureTexturesDescription",
	},
	{
		id: "auth",
		icon: "WifiHigh",
		title: "home.featureStableTitle",
		description: "home.featureStableDescription",
	},
] as const;

const audienceKeys = [
	{
		id: "server",
		icon: "Queue",
		title: "home.audienceServerTitle",
		description: "home.audienceServerDescription",
	},
	{
		id: "developer",
		icon: "BracketsCurly",
		title: "home.audienceDeveloperTitle",
		description: "home.audienceDeveloperDescription",
	},
	{
		id: "skin",
		icon: "FileImage",
		title: "home.audienceSkinTitle",
		description: "home.audienceSkinDescription",
	},
	{
		id: "community",
		icon: "User",
		title: "home.audienceCommunityTitle",
		description: "home.audienceCommunityDescription",
	},
] as const;

export default function PublicConnectPage() {
	const { t, i18n } = useTranslation();
	const branding = useFrontendConfigStore((state) => state.branding);
	const user = useAuthStore((state) => state.user);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isAdmin = useAuthStore((state) => state.isAdmin);
	const hydrate = useAuthStore((state) => state.hydrate);
	const logout = useAuthStore((state) => state.logout);
	const serverName = branding.title || t("home.titleFallback");
	const heroCopy = branding.description || t("home.heroCopy");
	const language = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
	const languageLabel =
		language === "zh-CN" ? t("login.languageZh") : t("login.languageEn");

	usePageTitle(serverName);

	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	return (
		<PublicEntryShell
			branding={branding}
			title={serverName}
			tagline={t("brand.tagline")}
			language={language}
			languageLabel={languageLabel}
			languageAriaLabel={t("login.language")}
			languageZhLabel={t("login.languageZh")}
			languageEnLabel={t("login.languageEn")}
			onLanguageChange={(next) => {
				if (next) void i18n.changeLanguage(next);
			}}
			variant="home"
			hideLanguageOnMobile
			headerActions={
				isAuthenticated && user ? (
					<PublicUserMenu
						username={user.username}
						role={user.role}
						isAdmin={isAdmin}
						onLogout={() => void logout()}
					/>
				) : (
					<Link
						to="/login"
						className={cn(
							buttonVariants({ variant: "default", size: "sm" }),
							"h-10 rounded-lg border-emerald-300/24 bg-emerald-500 px-4 text-white shadow-lg shadow-emerald-950/35 hover:bg-emerald-400",
						)}
					>
						<Icon name="SignIn" className="size-4" />
						{t("home.loginRegister")}
					</Link>
				)
			}
			footer={<AppFooter />}
		>
			<div className="relative min-h-[calc(100svh-5rem)] overflow-hidden">
				<main className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-[92rem] flex-col justify-between gap-10 px-4 pt-10 pb-8 sm:px-8 lg:px-12 lg:pt-16">
					<section className="grid items-center">
						<div className="public-home-enter max-w-4xl">
							<Badge className="rounded-full border-emerald-700/20 bg-emerald-600/12 px-3 py-1 text-emerald-800 shadow-lg shadow-black/10 dark:border-emerald-300/24 dark:bg-emerald-400/14 dark:text-emerald-100">
								<Icon name="SignIn" className="size-3.5" />
								{t("home.heroEyebrow")}
							</Badge>
							<h1 className="mt-6 max-w-3xl text-balance font-black text-5xl leading-[0.98] tracking-normal sm:text-7xl lg:text-8xl">
								{t("home.heroTitlePrefix")}{" "}
								<span className="text-emerald-700 drop-shadow-[0_0_28px_rgba(22,163,74,0.16)] dark:text-emerald-300 dark:drop-shadow-[0_0_28px_rgba(52,211,153,0.28)]">
									{t("home.heroTitleAccent")}
								</span>
							</h1>
							<p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg dark:text-slate-200">
								{heroCopy}
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								{isAuthenticated ? null : (
									<Link
										to="/login"
										className={cn(
											buttonVariants({ size: "lg" }),
											"h-12 min-w-44 rounded-lg border-emerald-300/28 bg-emerald-500 px-5 text-white shadow-xl shadow-emerald-950/40 hover:bg-emerald-400",
										)}
									>
										<Icon name="SignIn" className="size-5" />
										{t("home.primaryAction")}
									</Link>
								)}
								<Link
									to="/dashboard"
									className={cn(
										buttonVariants({ variant: "outline", size: "lg" }),
										"h-12 min-w-40 rounded-lg border-black/12 bg-white/70 px-5 text-[#102118] backdrop-blur hover:border-black/18 hover:bg-white/85 dark:border-white/22 dark:bg-white/7 dark:text-white dark:hover:border-white/38 dark:hover:bg-white/13",
									)}
								>
									<Icon
										name={isAuthenticated ? "Gauge" : "Info"}
										className="size-5"
									/>
									{isAuthenticated
										? t("home.consoleAction")
										: t("home.secondaryAction")}
								</Link>
							</div>
							<div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
								{featureKeys.map((feature, index) => (
									<HeroFeature
										key={feature.id}
										icon={feature.icon}
										title={t(feature.title)}
										description={t(feature.description)}
										delayMs={120 + index * 70}
									/>
								))}
							</div>
						</div>
					</section>

					<section
						className="public-home-enter pt-2"
						style={{ animationDelay: "260ms" }}
					>
						<div className="text-center">
							<h2 className="text-2xl font-semibold tracking-normal sm:text-3xl">
								{t("home.audienceHeadlinePrefix")}{" "}
								<span className="text-emerald-700 dark:text-emerald-300">
									{t("home.audienceHeadlineAccent")}
								</span>
							</h2>
							<p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
								{t("home.audienceDescription")}
							</p>
						</div>
						<div className="mx-auto mt-7 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
							{audienceKeys.map((feature) => (
								<AudienceTile
									key={feature.id}
									icon={feature.icon}
									title={t(feature.title)}
									description={t(feature.description)}
								/>
							))}
						</div>
					</section>
				</main>
			</div>
		</PublicEntryShell>
	);
}

function HeroFeature({
	icon,
	title,
	description,
	delayMs,
}: {
	icon: (typeof featureKeys)[number]["icon"];
	title: string;
	description: string;
	delayMs: number;
}) {
	return (
		<div
			className="public-home-enter grid grid-cols-[auto_minmax(0,1fr)] gap-3"
			style={{ animationDelay: `${delayMs}ms` }}
		>
			<div className="flex size-11 items-center justify-center rounded-xl border border-emerald-700/16 bg-emerald-600/10 text-emerald-700 shadow-lg shadow-black/10 backdrop-blur-md dark:border-emerald-300/18 dark:bg-emerald-400/12 dark:text-emerald-200">
				<Icon name={icon} className="size-5" />
			</div>
			<div className="min-w-0">
				<div className="font-semibold text-[#102118] dark:text-white">
					{title}
				</div>
				<p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-300">
					{description}
				</p>
			</div>
		</div>
	);
}

function AudienceTile({
	icon,
	title,
	description,
}: {
	icon: (typeof audienceKeys)[number]["icon"];
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-lg border border-black/10 bg-white/58 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition-[transform,background-color,border-color] duration-200 hover:-translate-y-1 hover:border-emerald-700/18 hover:bg-white/76 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/18 dark:hover:border-emerald-300/24 dark:hover:bg-white/[0.085]">
			<div className="mb-4 flex size-11 items-center justify-center rounded-md border border-emerald-700/16 bg-emerald-600/10 text-emerald-700 dark:border-emerald-300/16 dark:bg-emerald-400/12 dark:text-emerald-200">
				<Icon name={icon} className="size-6" />
			</div>
			<h3 className="text-base font-semibold text-[#102118] dark:text-white">
				{title}
			</h3>
			<p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
				{description}
			</p>
		</div>
	);
}

function PublicUserMenu({
	username,
	role,
	isAdmin,
	onLogout,
}: {
	username: string;
	role: string;
	isAdmin: boolean;
	onLogout: () => void;
}) {
	const { t } = useTranslation();
	const userName = username.trim() || "User";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-10 rounded-full border border-black/10 bg-white/64 px-1.5 pr-3 text-[#102118] shadow-lg shadow-black/12 backdrop-blur hover:bg-white/80 aria-expanded:bg-white/80 dark:border-white/14 dark:bg-white/8 dark:text-white dark:shadow-black/20 dark:hover:bg-white/14 dark:aria-expanded:bg-white/14"
						aria-label={userName}
					/>
				}
			>
				<UserAvatarImage
					name={userName}
					size="sm"
					className="size-7 rounded-xl bg-emerald-700/12 text-emerald-800 ring-emerald-700/20 dark:bg-white/12 dark:text-emerald-100 dark:ring-emerald-200/30"
				/>
				<span className="hidden max-w-28 truncate text-sm font-medium sm:block">
					{userName}
				</span>
				<Icon
					name="CaretDown"
					className="size-3.5 text-emerald-800/80 dark:text-emerald-100/80"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-64 border-border/70 bg-popover/95 p-2 text-popover-foreground shadow-2xl shadow-black/40 backdrop-blur-md ring-white/10"
			>
				<div className="flex items-center gap-3 rounded-md bg-muted/35 px-3 py-2">
					<UserAvatarImage
						name={userName}
						size="md"
						className="rounded-xl bg-muted/70 text-muted-foreground ring-border/60"
					/>
					<div className="min-w-0">
						<div className="truncate text-sm font-semibold text-popover-foreground">
							{userName}
						</div>
						<div className="mt-0.5 text-xs text-muted-foreground">{role}</div>
					</div>
				</div>
				<DropdownMenuSeparator className="mx-1 my-2 bg-border/70" />
				<div className="mt-2 grid gap-1">
					<DropdownMenuItem
						render={<Link to="/dashboard" />}
						className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent focus:bg-accent"
					>
						<Icon name="Gauge" className="size-4 text-muted-foreground" />
						{t("nav.dashboard")}
					</DropdownMenuItem>
					{isAdmin ? (
						<DropdownMenuItem
							render={<Link to="/dashboard/admin" />}
							className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent focus:bg-accent"
						>
							<Icon name="Shield" className="size-4 text-muted-foreground" />
							{t("nav.admin")}
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem
						render={<button type="button" />}
						variant="destructive"
						className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
						onClick={onLogout}
					>
						<Icon name="SignOut" className="size-4" />
						{t("nav.logout")}
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

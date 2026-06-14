import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { UserAvatarImage } from "@/components/common/UserAvatarImage";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/buttonVariants";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon, type IconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { config } from "@/config/app";
import { cn } from "@/lib/utils";
import { AppRouteFallback } from "@/router/RouteFallback";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import type { AvatarInfo } from "@/types/api";

type NavItem = {
	to: string;
	labelKey: string;
	icon: IconName;
	end?: boolean;
	preload?: () => Promise<unknown>;
};

const primaryNavItems: NavItem[] = [
	{
		to: "/dashboard",
		labelKey: "nav.dashboard",
		icon: "Gauge",
		end: true,
		preload: () => import("@/pages/app/WorkbenchPage"),
	},
	{
		to: "/dashboard/profiles",
		labelKey: "nav.profiles",
		icon: "User",
		preload: () => import("@/pages/app/ProfilesPage"),
	},
	{
		to: "/dashboard/wardrobe",
		labelKey: "nav.wardrobe",
		icon: "FileImage",
		preload: () => import("@/pages/app/WardrobePage"),
	},
];

const personalSettingsNavItem: NavItem = {
	to: "/dashboard/settings",
	labelKey: "nav.personalSettings",
	icon: "Gear",
	preload: () => import("@/pages/app/PersonalSettingsPage"),
};

const adminNavItems: NavItem[] = [
	{
		to: "/dashboard/admin/users",
		labelKey: "admin.nav.users",
		icon: "User",
		preload: () => import("@/pages/admin/AdminUsersPage"),
	},
	{
		to: "/dashboard/admin/external-auth",
		labelKey: "admin.nav.externalAuth",
		icon: "SignIn",
		preload: () => import("@/pages/admin/AdminExternalAuthPage"),
	},
	{
		to: "/dashboard/admin/audit",
		labelKey: "admin.nav.audit",
		icon: "ClipboardText",
		preload: () => import("@/pages/admin/AdminAuditPage"),
	},
	{
		to: "/dashboard/admin/tasks",
		labelKey: "admin.nav.tasks",
		icon: "Queue",
		preload: () => import("@/pages/admin/AdminTasksPage"),
	},
	{
		to: "/dashboard/admin/settings",
		labelKey: "admin.nav.settings",
		icon: "Gear",
		preload: () => import("@/pages/admin/AdminSettingsPage"),
	},
	{
		to: "/dashboard/admin/about",
		labelKey: "admin.nav.about",
		icon: "Info",
		preload: () => import("@/pages/admin/AdminAboutPage"),
	},
];

export function AppLayout() {
	const { t, i18n } = useTranslation();
	const location = useLocation();
	const user = useAuthStore((state) => state.user);
	const isAdmin = useAuthStore((state) => state.isAdmin);
	const logout = useAuthStore((state) => state.logout);
	const branding = useFrontendConfigStore((state) => state.branding);
	const userName = user?.username?.trim() || "User";
	const displayName = user?.profile?.display_name?.trim() || userName;
	const userAvatar = user?.profile?.avatar;
	const mobileNavItems = isAdmin
		? [...primaryNavItems, personalSettingsNavItem, ...adminNavItems]
		: [...primaryNavItems, personalSettingsNavItem];
	const isAdminPath = location.pathname.startsWith("/dashboard/admin");
	const language = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
	const languageLabel =
		language === "zh-CN" ? t("login.languageZh") : t("login.languageEn");
	const year = new Date().getFullYear();
	const sidebarVersion =
		config.appVersion === "dev" || config.appVersion === "unknown"
			? "1.0.0"
			: config.appVersion;

	return (
		<div
			className={cn(
				"app-shell min-h-dvh text-foreground",
				isAdminPath ? "admin-shell" : "bg-background",
			)}
		>
			<div className="grid min-h-dvh lg:grid-cols-[17rem_minmax(0,1fr)]">
				<aside className="hidden border-white/10 bg-[#0b271b] text-white shadow-2xl shadow-emerald-950/20 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:overflow-y-auto lg:flex-col">
					<div className="flex min-h-24 items-center gap-3 px-6">
						<Link to="/" className="group flex min-w-0 items-center gap-3">
							<BrandMark
								branding={branding}
								className="size-11 shrink-0 object-contain transition-transform group-hover:-translate-y-0.5"
								wordmarkClassName="h-10 max-w-44"
							/>
							<span className="min-w-0">
								<span className="block truncate text-lg font-semibold">
									{branding.title || t("brand.name")}
								</span>
								<span className="mt-1 block max-w-40 text-xs font-semibold leading-5 text-emerald-200">
									{t("brand.tagline")}
								</span>
							</span>
						</Link>
					</div>
					<nav className="flex flex-1 flex-col gap-2 px-4 py-6">
						{primaryNavItems.map((item) => (
							<AppNavLink key={item.to} item={item} label={t(item.labelKey)} />
						))}
						<AppNavLink
							item={personalSettingsNavItem}
							label={t(personalSettingsNavItem.labelKey)}
						/>
						{isAdmin ? (
							<>
								<div className="my-3 border-t border-white/12" />
								<div className="px-4 text-[11px] font-semibold tracking-wide text-emerald-100/55 uppercase">
									{t("admin.workspaceTitle")}
								</div>
								<div className="grid gap-2">
									{adminNavItems.map((item) => (
										<AppNavLink
											key={item.to}
											item={item}
											label={t(item.labelKey)}
										/>
									))}
								</div>
							</>
						) : null}
					</nav>
					<div className="m-4 rounded-xl border border-white/12 bg-white/8 p-4 shadow-2xl shadow-black/20 ring-1 ring-white/5 backdrop-blur">
						<div className="min-w-0">
							<div className="truncate text-base font-semibold text-white">
								{branding.title || config.appName} v{sidebarVersion}
							</div>
							<div className="mt-3 truncate text-sm text-white/68">
								© {year} {branding.title || config.appName}
							</div>
						</div>
					</div>
				</aside>
				<div className="min-w-0">
					<header
						className={cn(
							"sticky top-0 z-30 border-b backdrop-blur-xl",
							isAdminPath
								? "border-border/70 bg-background/88"
								: "border-border/60 bg-background/88",
						)}
					>
						<div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-7">
							<Link
								to="/"
								className="group flex min-w-0 items-center gap-3 lg:hidden"
							>
								<BrandMark
									branding={branding}
									className="size-9 shrink-0 object-contain transition-transform group-hover:-translate-y-0.5"
									wordmarkClassName="h-9 max-w-40"
								/>
								<span className="hidden min-w-0 sm:block">
									<span className="block truncate text-sm font-semibold">
										{branding.title || t("brand.name")}
									</span>
									<span className="block truncate text-[11px] font-medium text-muted-foreground">
										{t("brand.tagline")}
									</span>
								</span>
							</Link>
							<div className="relative hidden min-w-0 flex-1 md:block">
								<Icon
									name="MagnifyingGlass"
									className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									readOnly
									value=""
									placeholder={t("dashboard.searchPlaceholder")}
									className={cn(
										"h-10 rounded-xl border-border/55 pl-10 shadow-none",
										isAdminPath ? "bg-card/65" : "bg-muted/45",
									)}
								/>
								<span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-xs">
									⌘K
								</span>
							</div>
							<nav
								className={cn(
									"flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-lg border border-border/60 p-1 shadow-xs md:hidden",
									isAdminPath ? "bg-card/60" : "bg-card/70",
								)}
							>
								{mobileNavItems.map((item) => (
									<MobileAppNavLink
										key={item.to}
										item={item}
										label={t(item.labelKey)}
										isAdminPath={isAdminPath}
									/>
								))}
							</nav>
							<div className="ml-auto flex items-center gap-2">
								<ThemeToggleButton className="hidden sm:inline-flex" />
								<Select
									value={language}
									onValueChange={(next) => {
										if (next) void i18n.changeLanguage(next);
									}}
								>
									<SelectTrigger
										width="fit"
										className={cn(
											"hidden h-9 w-34 rounded-full border-border/60 bg-card/70 px-3 shadow-xs hover:bg-card sm:inline-flex",
											isAdminPath ? "bg-card/65" : "bg-card/70",
										)}
										aria-label={t("login.language")}
									>
										<Icon name="Globe" className="size-4" />
										<span className="min-w-0 flex-1 truncate text-left">
											{languageLabel}
										</span>
									</SelectTrigger>
									<SelectContent
										align="end"
										alignItemWithTrigger={false}
										className="min-w-48 border-border/70 bg-popover/95 text-popover-foreground shadow-2xl shadow-black/25 backdrop-blur-xl"
									>
										<SelectItem value="zh-CN" className="whitespace-nowrap">
											{t("login.languageZh")}
										</SelectItem>
										<SelectItem value="en-US" className="whitespace-nowrap">
											{t("login.languageEn")}
										</SelectItem>
									</SelectContent>
								</Select>
								<DashboardUserMenu
									displayName={displayName}
									userName={userName}
									avatar={userAvatar}
									role={user?.role ?? ""}
									isAdmin={isAdmin}
									isAdminPath={isAdminPath}
									onLogout={() => void logout()}
								/>
							</div>
						</div>
					</header>
					<main>
						<div key={location.pathname} className="app-route-transition">
							<Suspense fallback={<AppRouteFallback />}>
								<Outlet />
							</Suspense>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

function DashboardUserMenu({
	avatar,
	displayName,
	userName,
	role,
	isAdmin,
	isAdminPath,
	onLogout,
}: {
	avatar?: AvatarInfo | null;
	displayName: string;
	userName: string;
	role: string;
	isAdmin: boolean;
	isAdminPath: boolean;
	onLogout: () => void;
}) {
	const { t } = useTranslation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={cn(
							"h-10 min-w-0 max-w-60 gap-2 rounded-full border border-border/60 px-1.5 pr-2.5 shadow-xs hover:bg-card aria-expanded:bg-card",
							isAdminPath ? "bg-card/65" : "bg-card/70",
						)}
						aria-label={displayName}
					/>
				}
			>
				<UserAvatarImage
					name={displayName}
					avatar={avatar}
					size="sm"
					className="rounded-xl bg-muted/80 text-muted-foreground ring-border/60"
				/>
				<span className="hidden min-w-0 max-w-28 truncate text-sm font-semibold sm:block">
					{displayName}
				</span>
				{role === "admin" ? (
					<Badge
						variant="outline"
						className="hidden border-border/50 bg-background/70 px-1.5 py-0 text-[11px] text-muted-foreground md:inline-flex"
					>
						admin
					</Badge>
				) : null}
				<Icon
					name="CaretDown"
					className="size-3.5 shrink-0 text-muted-foreground"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-64 border-border/70 bg-popover/95 p-2 text-popover-foreground shadow-2xl shadow-black/25 backdrop-blur-xl"
			>
				<div className="flex items-center gap-3 rounded-md bg-muted/35 px-3 py-2">
					<UserAvatarImage
						name={displayName}
						avatar={avatar}
						size="md"
						className="rounded-xl bg-muted/70 text-muted-foreground ring-border/60"
					/>
					<div className="min-w-0">
						<div className="truncate text-sm font-semibold text-popover-foreground">
							{displayName}
						</div>
						<div className="mt-0.5 text-xs text-muted-foreground">
							<span className="truncate">
								{userName}
								{role ? ` · ${role}` : ""}
							</span>
						</div>
					</div>
				</div>
				{isAdminPath ? (
					<div className="mt-2 grid gap-1">
						<DropdownMenuItem
							render={<Link to="/" />}
							className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent focus:bg-accent"
						>
							<Icon name="House" className="size-4 text-muted-foreground" />
							{t("common.backToHome")}
						</DropdownMenuItem>
						<DropdownMenuItem
							render={<Link to="/dashboard/settings" />}
							className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent focus:bg-accent"
						>
							<Icon name="Gear" className="size-4 text-muted-foreground" />
							{t("nav.personalSettings")}
						</DropdownMenuItem>
					</div>
				) : isAdmin ? (
					<div className="mt-2 grid gap-1">
						<DropdownMenuItem
							render={<Link to="/dashboard/admin" />}
							className="flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent focus:bg-accent"
						>
							<Icon name="Shield" className="size-4 text-muted-foreground" />
							{t("nav.admin")}
						</DropdownMenuItem>
					</div>
				) : null}
				<DropdownMenuItem
					render={<button type="button" />}
					variant="destructive"
					className="mt-2 flex min-h-9 w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
					onClick={onLogout}
				>
					<Icon name="SignOut" className="size-4" />
					{t("nav.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function AppNavLink({ item, label }: { item: NavItem; label: string }) {
	return (
		<NavLink
			to={item.to}
			end={item.end}
			onFocus={() => {
				void item.preload?.();
			}}
			onMouseEnter={() => {
				void item.preload?.();
			}}
			className={({ isActive }) =>
				cn(
					"flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition-[background-color,color,transform] hover:-translate-y-px",
					isActive
						? "bg-white/12 text-white shadow-lg shadow-black/15"
						: "text-emerald-50/82 hover:bg-white/8 hover:text-white",
				)
			}
		>
			<Icon name={item.icon} className="size-4" />
			{label}
		</NavLink>
	);
}

function MobileAppNavLink({
	isAdminPath,
	item,
	label,
}: {
	isAdminPath: boolean;
	item: NavItem;
	label: string;
}) {
	return (
		<NavLink
			to={item.to}
			end={item.end}
			onFocus={() => {
				void item.preload?.();
			}}
			onMouseEnter={() => {
				void item.preload?.();
			}}
			className={({ isActive }) =>
				cn(
					buttonVariants({
						variant: isActive ? "secondary" : "ghost",
						size: "sm",
					}),
					"h-9 shrink-0 rounded-md transition-[background-color,color,transform] hover:-translate-y-px",
					isActive
						? "shadow-xs"
						: isAdminPath
							? "text-muted-foreground hover:text-foreground"
							: "text-muted-foreground",
				)
			}
		>
			<Icon name={item.icon} className="size-4" />
			{label}
		</NavLink>
	);
}

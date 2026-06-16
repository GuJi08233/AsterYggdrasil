import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import {
	getShellNavSections,
	type ShellNavItem,
} from "@/components/shell/shellNavigation";
import { Icon } from "@/components/ui/icon";
import { config } from "@/config/app";
import type { AppliedBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function ShellSidebar({
	branding,
	isAdmin,
	mobileOpen,
	onMobileClose,
}: {
	branding: AppliedBranding;
	isAdmin: boolean;
	mobileOpen: boolean;
	onMobileClose: () => void;
}) {
	const { t } = useTranslation();
	const navSections = getShellNavSections(isAdmin);
	const year = new Date().getFullYear();
	const sidebarVersion =
		config.appVersion === "dev" || config.appVersion === "unknown"
			? "1.0.0"
			: config.appVersion;

	return (
		<>
			<button
				type="button"
				className={cn(
					"fixed inset-0 z-40 cursor-default bg-black/42 transition-opacity duration-200 ease-out lg:hidden motion-reduce:transition-none",
					mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
				)}
				aria-label={t("common.close")}
				tabIndex={mobileOpen ? 0 : -1}
				onClick={onMobileClose}
			/>
			<aside
				id="shell-mobile-sidebar"
				data-slot="shell-mobile-drawer"
				data-theme-surface="chrome"
				className={cn(
					"fixed inset-y-0 left-0 z-50 grid h-dvh w-[min(22rem,calc(100vw-2.5rem))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-white/10 bg-[#0b271b] text-white transition-[translate,box-shadow] duration-200 ease-out will-change-transform lg:hidden motion-reduce:transition-none",
					mobileOpen
						? "translate-x-0 shadow-2xl shadow-black/35"
						: "pointer-events-none -translate-x-[calc(100%+1rem)] shadow-none",
				)}
				aria-hidden={!mobileOpen}
				inert={mobileOpen ? undefined : true}
			>
				<ShellSidebarBrand branding={branding} className="min-h-20 pr-14" />
				<ShellSidebarNavigation
					navSections={navSections}
					className="min-h-0 overflow-y-auto px-4 pt-2 pb-6"
					onNavigate={onMobileClose}
				/>
				<ShellSidebarFooter
					branding={branding}
					sidebarVersion={sidebarVersion}
					year={year}
				/>
				<button
					type="button"
					className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-lg text-emerald-50/82 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-white/25 focus-visible:outline-none"
					aria-label={t("common.close")}
					onClick={onMobileClose}
				>
					<Icon name="X" className="size-4" />
				</button>
			</aside>
			<aside
				data-slot="shell-desktop-sidebar"
				data-theme-surface="chrome"
				className="hidden border-white/10 bg-[#0b271b] text-white shadow-2xl shadow-emerald-950/20 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:overflow-y-auto"
			>
				<ShellSidebarBrand branding={branding} />
				<ShellSidebarNavigation
					navSections={navSections}
					className="flex-1 px-4 py-6"
				/>
				<ShellSidebarFooter
					branding={branding}
					sidebarVersion={sidebarVersion}
					year={year}
				/>
			</aside>
		</>
	);
}

function ShellSidebarFooter({
	branding,
	sidebarVersion,
	year,
}: {
	branding: AppliedBranding;
	sidebarVersion: string;
	year: number;
}) {
	return (
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
	);
}

export function ShellSidebarBrand({
	branding,
	className,
}: {
	branding: AppliedBranding;
	className?: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			data-theme-surface="chrome"
			className={cn("flex min-h-24 items-center gap-3 px-6", className)}
		>
			<Link to="/" className="group flex min-w-0 items-center gap-3">
				<BrandMark
					branding={branding}
					className="size-11 shrink-0 object-contain"
					wordmarkClassName="h-10 max-w-44"
				/>
				<span className="min-w-0">
					<span className="block truncate text-lg font-semibold">
						{branding.title || t("brand.name")}
					</span>
				</span>
			</Link>
		</div>
	);
}

export function ShellSidebarNavigation({
	className,
	navSections,
	onNavigate,
}: {
	className?: string;
	navSections: ReturnType<typeof getShellNavSections>;
	onNavigate?: () => void;
}) {
	const { t } = useTranslation();

	return (
		<nav className={cn("flex flex-col gap-6", className)}>
			{navSections.map((section) => (
				<div key={section.id} className="grid gap-2">
					<div className="px-4 text-[11px] font-semibold tracking-wide text-emerald-100/55 uppercase">
						{t(section.labelKey)}
					</div>
					{section.items.map((item) => (
						<ShellSidebarNavLink
							key={item.to}
							item={item}
							label={t(item.labelKey)}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			))}
		</nav>
	);
}

export function ShellSidebarNavLink({
	item,
	label,
	onNavigate,
}: {
	item: ShellNavItem;
	label: string;
	onNavigate?: () => void;
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
			onClick={onNavigate}
			className={({ isActive }) =>
				cn(
					"flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold transition-[background-color,color,box-shadow]",
					isActive
						? "bg-white/12 text-white shadow-lg shadow-black/15"
						: "text-emerald-50/82 hover:bg-white/8 hover:text-white hover:shadow-sm hover:shadow-black/10",
				)
			}
		>
			<Icon name={item.icon} className="size-4" />
			{label}
		</NavLink>
	);
}

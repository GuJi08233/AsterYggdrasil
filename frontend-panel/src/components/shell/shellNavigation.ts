import type { IconName } from "@/components/ui/icon";
import { accountPaths, adminPaths } from "@/routes/routePaths";

export type ShellScope = "account" | "admin";

export type ShellNavItem = {
	to: string;
	labelKey: string;
	icon: IconName;
	end?: boolean;
	preload?: () => Promise<unknown>;
};

export type ShellNavSection = {
	id: "account" | "admin";
	labelKey: string;
	items: ShellNavItem[];
};

export const accountNavItems: ShellNavItem[] = [
	{
		to: accountPaths.home,
		labelKey: "nav.account",
		icon: "Gauge",
		end: true,
		preload: () => import("@/pages/account/AccountOverviewPage"),
	},
	{
		to: accountPaths.profiles,
		labelKey: "nav.profiles",
		icon: "User",
		preload: () => import("@/pages/account/MinecraftProfilesPage"),
	},
	{
		to: accountPaths.wardrobe,
		labelKey: "nav.wardrobe",
		icon: "FileImage",
		preload: () => import("@/pages/account/TextureWardrobePage"),
	},
];

export const personalSettingsNavItem: ShellNavItem = {
	to: accountPaths.settings,
	labelKey: "nav.personalSettings",
	icon: "Gear",
	preload: () => import("@/pages/account/AccountSettingsPage"),
};

export const adminNavItems: ShellNavItem[] = [
	{
		to: adminPaths.users,
		labelKey: "admin.nav.users",
		icon: "User",
		preload: () => import("@/pages/admin/AdminUsersPage"),
	},
	{
		to: adminPaths.externalAuth,
		labelKey: "admin.nav.externalAuth",
		icon: "SignIn",
		preload: () => import("@/pages/admin/AdminExternalAuthPage"),
	},
	{
		to: adminPaths.audit,
		labelKey: "admin.nav.audit",
		icon: "ClipboardText",
		preload: () => import("@/pages/admin/AdminAuditPage"),
	},
	{
		to: adminPaths.tasks,
		labelKey: "admin.nav.tasks",
		icon: "Queue",
		preload: () => import("@/pages/admin/AdminTasksPage"),
	},
	{
		to: adminPaths.settings,
		labelKey: "admin.nav.settings",
		icon: "Gear",
		preload: () => import("@/pages/admin/AdminSettingsPage"),
	},
	{
		to: adminPaths.about,
		labelKey: "admin.nav.about",
		icon: "Info",
		preload: () => import("@/pages/admin/AdminAboutPage"),
	},
];

export function getShellNavSections(isAdmin: boolean): ShellNavSection[] {
	const sections: ShellNavSection[] = [
		{
			id: "account",
			labelKey: "shell.sections.account",
			items: [...accountNavItems, personalSettingsNavItem],
		},
	];

	if (isAdmin) {
		sections.push({
			id: "admin",
			labelKey: "shell.sections.admin",
			items: adminNavItems,
		});
	}

	return sections;
}

import enAccount from "@/i18n/locales/en-US/account.json";
import enAdmin from "@/i18n/locales/en-US/admin.json";
import enAdminAudit from "@/i18n/locales/en-US/admin-audit.json";
import enAdminExternalAuth from "@/i18n/locales/en-US/admin-external-auth.json";
import enAdminTasks from "@/i18n/locales/en-US/admin-tasks.json";
import enAdminUsers from "@/i18n/locales/en-US/admin-users.json";
import enErrors from "@/i18n/locales/en-US/errors.json";
import enPublic from "@/i18n/locales/en-US/public.json";
import enPwa from "@/i18n/locales/en-US/pwa.json";
import enSettings from "@/i18n/locales/en-US/settings.json";
import enShell from "@/i18n/locales/en-US/shell.json";
import zhAccount from "@/i18n/locales/zh-CN/account.json";
import zhAdmin from "@/i18n/locales/zh-CN/admin.json";
import zhAdminAudit from "@/i18n/locales/zh-CN/admin-audit.json";
import zhAdminExternalAuth from "@/i18n/locales/zh-CN/admin-external-auth.json";
import zhAdminTasks from "@/i18n/locales/zh-CN/admin-tasks.json";
import zhAdminUsers from "@/i18n/locales/zh-CN/admin-users.json";
import zhErrors from "@/i18n/locales/zh-CN/errors.json";
import zhPublic from "@/i18n/locales/zh-CN/public.json";
import zhPwa from "@/i18n/locales/zh-CN/pwa.json";
import zhSettings from "@/i18n/locales/zh-CN/settings.json";
import zhShell from "@/i18n/locales/zh-CN/shell.json";

const enFrontend = {
	...enShell,
	...enPublic,
	...enAccount,
	...enErrors,
	...enPwa,
	...enAdmin,
	admin: {
		...enAdmin.admin,
		audit: enAdminAudit.admin.audit,
		externalAuth: enAdminExternalAuth.admin.externalAuth,
		tasks: enAdminTasks.admin.tasks,
		users: enAdminUsers.admin.users,
	},
	...enSettings,
};

const zhFrontend = {
	...zhShell,
	...zhPublic,
	...zhAccount,
	...zhErrors,
	...zhPwa,
	...zhAdmin,
	admin: {
		...zhAdmin.admin,
		audit: zhAdminAudit.admin.audit,
		externalAuth: zhAdminExternalAuth.admin.externalAuth,
		tasks: zhAdminTasks.admin.tasks,
		users: zhAdminUsers.admin.users,
	},
	...zhSettings,
};

export const resources = {
	"en-US": {
		frontend: enFrontend,
	},
	"zh-CN": {
		frontend: zhFrontend,
	},
} as const;

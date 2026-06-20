import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://yggdrasil.astercosm.com/";
const ZH_SITE_DESCRIPTION =
	"AsterYggdrasil 官方文档中心，覆盖 Minecraft 皮肤站、Yggdrasil/authlib-injector 接入、玩家档案、材质管理、管理员配置和部署维护。";
const EN_SITE_DESCRIPTION =
	"Official AsterYggdrasil documentation covering the Minecraft skin site, Yggdrasil/authlib-injector integration, player profiles, texture management, administrator configuration, and deployment.";

type LocaleKey = "root" | "en";

const locales: Record<
	LocaleKey,
	{
		lang: string;
		siteDescription: string;
		ogLocale: string;
	}
> = {
	root: {
		lang: "zh-CN",
		siteDescription: ZH_SITE_DESCRIPTION,
		ogLocale: "zh_CN",
	},
	en: {
		lang: "en-US",
		siteDescription: EN_SITE_DESCRIPTION,
		ogLocale: "en_US",
	},
};

function getVersion(): string {
	try {
		const cargoPath = resolve(__dirname, "../../Cargo.toml");
		const content = readFileSync(cargoPath, "utf-8");
		const match = content.match(/^version\s*=\s*"([^"]+)"/m);
		return match ? match[1] : "unknown";
	} catch {
		return "unknown";
	}
}

const version = getVersion();
const PAGE_DESCRIPTION_LIMIT = 160;
const MIN_USEFUL_DESCRIPTION_LENGTH = 24;
const descriptionCache = new Map<string, string>();

function toCanonicalPath(page: string): string {
	const normalizedPage = page.replace(/\\/g, "/").replace(/\.md$/, "");

	if (normalizedPage === "index") {
		return "/";
	}

	if (normalizedPage.endsWith("/index")) {
		return `/${normalizedPage.slice(0, -"/index".length)}/`;
	}

	return `/${normalizedPage}`;
}

function getLocaleForPage(page: string): LocaleKey {
	return page.replace(/\\/g, "/").startsWith("en/") ? "en" : "root";
}

function getBasePage(page: string): string {
	const normalizedPage = page.replace(/\\/g, "/");
	return normalizedPage.startsWith("en/") ? normalizedPage.slice("en/".length) : normalizedPage;
}

function getLocalizedPage(page: string, locale: LocaleKey): string {
	const basePage = getBasePage(page);
	return locale === "en" ? `en/${basePage}` : basePage;
}

function stripFrontmatter(source: string): string {
	const normalizedSource = source.replace(/^\uFEFF/, "");
	const match = normalizedSource.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? normalizedSource.slice(match[0].length) : normalizedSource;
}

function normalizeInlineMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/[*_]/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.replace(/\s+([，。！？；：,.!?;:])/g, "$1")
		.trim();
}

function truncateDescription(text: string): string {
	if (text.length <= PAGE_DESCRIPTION_LIMIT) {
		return text;
	}

	const sliced = text.slice(0, PAGE_DESCRIPTION_LIMIT).replace(/[\s，。！？；：,.!?;:]+$/u, "");
	return `${sliced}…`;
}

function extractDescriptionFromMarkdown(source: string): string {
	const lines = stripFrontmatter(source).split(/\r?\n/);
	let shortFallback = "";

	for (let index = 0; index < lines.length; ) {
		const line = lines[index].trim();

		if (!line || line.startsWith("#")) {
			index += 1;
			continue;
		}

		if (/^:::\s*/.test(line)) {
			const customBlockLines: string[] = [];
			index += 1;
			while (index < lines.length && !/^\s*:::\s*$/.test(lines[index].trim())) {
				customBlockLines.push(lines[index]);
				index += 1;
			}
			if (index < lines.length) {
				index += 1;
			}

			const customBlockDescription = extractDescriptionFromMarkdown(customBlockLines.join("\n"));
			if (customBlockDescription.length >= MIN_USEFUL_DESCRIPTION_LENGTH) {
				return customBlockDescription;
			}
			if (customBlockDescription && !shortFallback) {
				shortFallback = customBlockDescription;
			}

			continue;
		}

		if (/^```/.test(line) || /^~~~/.test(line)) {
			const fence = line.startsWith("```") ? "```" : "~~~";
			index += 1;
			while (index < lines.length && !lines[index].trim().startsWith(fence)) {
				index += 1;
			}
			if (index < lines.length) {
				index += 1;
			}
			continue;
		}

		if (/^[>*+\-|]\s/.test(line) || /^\|/.test(line)) {
			index += 1;
			while (index < lines.length && lines[index].trim()) {
				index += 1;
			}
			continue;
		}

		const paragraphLines = [line];
		index += 1;

		while (index < lines.length) {
			const nextLine = lines[index].trim();
			if (
				!nextLine ||
				nextLine.startsWith("#") ||
				/^:::\s*/.test(nextLine) ||
				/^```/.test(nextLine) ||
				/^~~~/.test(nextLine) ||
				/^[>*+\-|]\s/.test(nextLine) ||
				/^\|/.test(nextLine)
			) {
				break;
			}
			paragraphLines.push(nextLine);
			index += 1;
		}

		const paragraph = normalizeInlineMarkdown(paragraphLines.join(" "));
		if (!paragraph) {
			continue;
		}

		if (paragraph.length >= MIN_USEFUL_DESCRIPTION_LENGTH) {
			return truncateDescription(paragraph);
		}

		if (!shortFallback) {
			shortFallback = paragraph;
		}
	}

	return shortFallback ? truncateDescription(shortFallback) : "";
}

function getPageDescription(sourceDir: string, relativePath: string): string {
	const absolutePath = resolve(sourceDir, relativePath);
	const cached = descriptionCache.get(absolutePath);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const description = extractDescriptionFromMarkdown(readFileSync(absolutePath, "utf-8"));
		descriptionCache.set(absolutePath, description);
		return description;
	} catch {
		descriptionCache.set(absolutePath, "");
		return "";
	}
}

export default withMermaid(
	defineConfig({
		title: "AsterYggdrasil",
		description: ZH_SITE_DESCRIPTION,
		lang: "zh-CN",
		cleanUrls: true,
		lastUpdated: true,
		sitemap: {
			hostname: SITE_URL,
		},
		head: [
			["meta", { name: "theme-color", content: "#111827" }],
			["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
			["meta", { property: "og:type", content: "website" }],
			["meta", { property: "og:site_name", content: "AsterYggdrasil" }],
			["meta", { name: "twitter:card", content: "summary" }],
		],
		locales: {
			root: {
				label: "简体中文",
				lang: "zh-CN",
				title: "AsterYggdrasil",
				description: ZH_SITE_DESCRIPTION,
				themeConfig: {
					outline: {
						label: "本页内容",
					},
					lastUpdated: {
						text: "最后更新",
					},
					docFooter: {
						prev: "上一页",
						next: "下一页",
					},
					darkModeSwitchLabel: "外观",
					darkModeSwitchTitle: "切换到深色主题",
					lightModeSwitchTitle: "切换到浅色主题",
					sidebarMenuLabel: "菜单",
					returnToTopLabel: "返回顶部",
					langMenuLabel: "切换语言",
					skipToContentLabel: "跳到内容",
					search: {
						provider: "local",
						options: {
							translations: {
								button: {
									buttonText: "搜索",
									buttonAriaLabel: "搜索",
								},
								modal: {
									displayDetails: "显示详细列表",
									resetButtonTitle: "清除搜索",
									backButtonTitle: "关闭搜索",
									noResultsText: "没有找到相关结果",
									footer: {
										selectText: "选择",
										selectKeyAriaLabel: "Enter",
										navigateText: "切换",
										navigateUpKeyAriaLabel: "向上",
										navigateDownKeyAriaLabel: "向下",
										closeText: "关闭",
										closeKeyAriaLabel: "Escape",
									},
								},
							},
						},
					},
					nav: [
						{ text: "首页", link: "/" },
						{ text: "快速开始", link: "/guide/getting-started" },
						{ text: "使用指南", link: "/guide/" },
						{ text: "接入", link: "/guide/launcher-setup" },
						{ text: "部署", link: "/deployment/" },
						{ text: "关于", link: "/guide/about" },
						{ text: `v${version}`, link: "https://github.com/AsterCommunity/AsterYggdrasil" },
					],
					sidebar: [
						{
							text: "开始",
							items: [
								{ text: "概览", link: "/" },
								{ text: "使用指南总览", link: "/guide/" },
								{ text: "快速开始", link: "/guide/getting-started" },
							],
						},
						{
							text: "玩家使用",
							items: [
								{ text: "用户手册", link: "/guide/user-guide" },
								{ text: "玩家档案", link: "/guide/profiles" },
								{ text: "材质处理", link: "/guide/yggdrasil-textures" },
								{ text: "常见问题速查", link: "/guide/faq" },
							],
						},
						{
							text: "接入协议",
							items: [
								{ text: "启动器填写", link: "/guide/launcher-setup" },
								{ text: "启动器登录", link: "/guide/launcher-login" },
								{ text: "Yggdrasil 转发", link: "/guide/yggdrasil-forwarding" },
								{ text: "Yggdrasil API", link: "/guide/yggdrasil-api" },
								{ text: "故障排查", link: "/guide/troubleshooting" },
							],
						},
						{
							text: "管理维护",
							items: [
								{ text: "管理员指南", link: "/guide/admin-guide" },
								{ text: "能力封禁", link: "/guide/user-bans" },
								{ text: "配置和密钥", link: "/guide/configuration" },
								{ text: "对象存储", link: "/guide/storage" },
								{ text: "审计与后台任务", link: "/guide/audit-tasks" },
							],
						},
						{
							text: "部署",
							items: [
								{ text: "部署总览", link: "/deployment/" },
								{ text: "Docker", link: "/deployment/docker" },
							],
						},
						{
							text: "项目参考",
							items: [
								{ text: "关于", link: "/guide/about" },
								{ text: "文档贡献说明", link: "/guide/docs-contributing" },
							],
						},
					],
				},
			},
			en: {
				label: "English",
				lang: "en-US",
				title: "AsterYggdrasil",
				link: "/en/",
				description: EN_SITE_DESCRIPTION,
				themeConfig: {
					nav: [
						{ text: "Home", link: "/en/" },
						{ text: "Getting Started", link: "/en/guide/getting-started" },
						{ text: "Guides", link: "/en/guide/" },
						{ text: "Integration", link: "/en/guide/launcher-setup" },
						{ text: "Deployment", link: "/en/deployment/" },
						{ text: "About", link: "/en/guide/about" },
						{ text: `v${version}`, link: "https://github.com/AsterCommunity/AsterYggdrasil" },
					],
					sidebar: [
						{
							text: "Start",
							items: [
								{ text: "Overview", link: "/en/" },
								{ text: "Guides Overview", link: "/en/guide/" },
								{ text: "Getting Started", link: "/en/guide/getting-started" },
							],
						},
						{
							text: "Player Usage",
							items: [
								{ text: "User Guide", link: "/en/guide/user-guide" },
								{ text: "Minecraft Profiles", link: "/en/guide/profiles" },
								{ text: "Textures", link: "/en/guide/yggdrasil-textures" },
								{ text: "FAQ", link: "/en/guide/faq" },
							],
						},
						{
							text: "Protocol Integration",
							items: [
								{ text: "Launcher Setup", link: "/en/guide/launcher-setup" },
								{ text: "Launcher Login", link: "/en/guide/launcher-login" },
								{ text: "Yggdrasil Forwarding", link: "/en/guide/yggdrasil-forwarding" },
								{ text: "Yggdrasil API", link: "/en/guide/yggdrasil-api" },
								{ text: "Troubleshooting", link: "/en/guide/troubleshooting" },
							],
						},
						{
							text: "Admin Maintenance",
							items: [
								{ text: "Admin Guide", link: "/en/guide/admin-guide" },
								{ text: "Capability Bans", link: "/en/guide/user-bans" },
								{ text: "Config and Keys", link: "/en/guide/configuration" },
								{ text: "Object Storage", link: "/en/guide/storage" },
								{ text: "Audit and Tasks", link: "/en/guide/audit-tasks" },
							],
						},
						{
							text: "Deployment",
							items: [
								{ text: "Deployment Overview", link: "/en/deployment/" },
								{ text: "Docker", link: "/en/deployment/docker" },
							],
						},
						{
							text: "Project Reference",
							items: [
								{ text: "About", link: "/en/guide/about" },
								{ text: "Docs Contributing", link: "/en/guide/docs-contributing" },
							],
						},
					],
				},
			},
		},
		transformHead(context) {
			if (context.page === "404.md") {
				return [["meta", { name: "robots", content: "noindex, nofollow" }]];
			}

			const locale = getLocaleForPage(context.page);
			const canonicalUrl = new URL(toCanonicalPath(context.page), SITE_URL).href;
			const rootUrl = new URL(toCanonicalPath(getLocalizedPage(context.page, "root")), SITE_URL).href;
			const enUrl = new URL(toCanonicalPath(getLocalizedPage(context.page, "en")), SITE_URL).href;
			const title = context.title || "AsterYggdrasil";
			const description = context.description || locales[locale].siteDescription;

			return [
				["link", { rel: "canonical", href: canonicalUrl }],
				["link", { rel: "alternate", hreflang: locales.root.lang, href: rootUrl }],
				["link", { rel: "alternate", hreflang: locales.en.lang, href: enUrl }],
				["link", { rel: "alternate", hreflang: "x-default", href: rootUrl }],
				["meta", { property: "og:title", content: title }],
				["meta", { property: "og:description", content: description }],
				["meta", { property: "og:url", content: canonicalUrl }],
				["meta", { property: "og:locale", content: locales[locale].ogLocale }],
				[
					"meta",
					{
						property: "og:locale:alternate",
						content: locales[locale === "en" ? "root" : "en"].ogLocale,
					},
				],
				["meta", { name: "twitter:title", content: title }],
				["meta", { name: "twitter:description", content: description }],
			];
		},
		transformPageData(pageData, { siteConfig }) {
			if (pageData.description) {
				return undefined;
			}

			const inferredDescription = getPageDescription(siteConfig.srcDir, pageData.filePath);
			if (!inferredDescription) {
				return undefined;
			}

			return {
				description: inferredDescription,
			};
		},
		themeConfig: {
			search: {
				provider: "local",
			},
			socialLinks: [
				{ icon: "github", link: "https://github.com/AsterCommunity/AsterYggdrasil" },
			],
			footer: {
				message: "Released under the MIT License.",
				copyright: "Copyright (c) AptS-1547",
			},
		},
	}),
);

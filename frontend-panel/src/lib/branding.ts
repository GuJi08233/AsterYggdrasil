import type { PublicBranding } from "@/types/api";

export type AppliedBranding = {
	title: string;
	description: string;
	faviconUrl: string;
	wordmarkDarkUrl: string;
	wordmarkLightUrl: string;
};

export const DEFAULT_BRANDING: AppliedBranding = {
	title: "AsterYggdrasil",
	description: "Minecraft skin site and Yggdrasil authentication server",
	faviconUrl: "/favicon.svg",
	wordmarkDarkUrl: "",
	wordmarkLightUrl: "",
};

export function resolveBranding(
	branding?: Partial<PublicBranding> | null,
): AppliedBranding {
	return {
		title: normalizeText(branding?.title, DEFAULT_BRANDING.title),
		description: normalizeText(
			branding?.description,
			DEFAULT_BRANDING.description,
		),
		faviconUrl: normalizeAssetUrl(
			branding?.favicon_url,
			DEFAULT_BRANDING.faviconUrl,
		),
		wordmarkDarkUrl: normalizeAssetUrl(
			branding?.wordmark_dark_url,
			DEFAULT_BRANDING.wordmarkDarkUrl,
		),
		wordmarkLightUrl: normalizeAssetUrl(
			branding?.wordmark_light_url,
			DEFAULT_BRANDING.wordmarkLightUrl,
		),
	};
}

export function applyBranding(branding: AppliedBranding): void {
	if (typeof document === "undefined") return;

	document.title = branding.title;
	upsertMetaTag("description", branding.description);
	upsertLinkTag('link[rel="icon"]', {
		rel: "icon",
		href: branding.faviconUrl,
	});
	upsertLinkTag('link[rel="apple-touch-icon"]', {
		rel: "apple-touch-icon",
		href: branding.faviconUrl,
	});
}

export function formatDocumentTitle(
	appTitle: string | null | undefined,
	pageTitle?: string | null,
): string {
	const normalizedAppTitle = normalizeText(appTitle, DEFAULT_BRANDING.title);
	const normalizedPageTitle = pageTitle?.trim();

	if (!normalizedPageTitle || normalizedPageTitle === normalizedAppTitle) {
		return normalizedAppTitle;
	}

	return `${normalizedPageTitle} · ${normalizedAppTitle}`;
}

function normalizeText(
	value: string | null | undefined,
	fallback: string,
): string {
	const normalized = value?.trim();
	if (!normalized || normalized.includes("%ASTERYGGDRASIL_")) return fallback;
	return normalized;
}

function normalizeAssetUrl(
	value: string | null | undefined,
	fallback: string,
): string {
	const normalized = value?.trim();
	if (!normalized || normalized.includes("%ASTERYGGDRASIL_")) return fallback;
	if (
		normalized.startsWith("/") &&
		!normalized.startsWith("//") &&
		!normalized.includes(" ")
	) {
		return normalized;
	}

	try {
		const resolved = new URL(normalized);
		if (resolved.protocol === "http:" || resolved.protocol === "https:") {
			return resolved.toString();
		}
	} catch {
		// Invalid branding asset URLs fall back to the bundled defaults.
	}

	return fallback;
}

function upsertMetaTag(name: string, content: string): void {
	let meta = document.head.querySelector<HTMLMetaElement>(
		`meta[name="${name}"]`,
	);
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = name;
		document.head.append(meta);
	}
	meta.content = content;
}

function upsertLinkTag(
	selector: string,
	attributes: { rel: string; href: string },
): void {
	let link = document.head.querySelector<HTMLLinkElement>(selector);
	if (!link) {
		link = document.createElement("link");
		document.head.append(link);
	}
	link.rel = attributes.rel;
	link.href = attributes.href;
	link.removeAttribute("type");
}

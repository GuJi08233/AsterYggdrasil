import type { ExternalAuthKind } from "@/types/api";

const SAFE_EXTERNAL_AUTH_ICON_URL_PATTERN = /^\/(?!\/)|^https:\/\//i;

export function externalAuthKindIconPath(kind: ExternalAuthKind): string {
	switch (kind) {
		case "generic_oauth2":
			return "/static/external-auth/oauth-logo.svg";
		case "github":
			return "/static/external-auth/github-logo.svg";
		case "google":
			return "/static/external-auth/google-logo.svg";
		case "microsoft":
			return "/static/external-auth/microsoft-logo.svg";
		case "qq":
			return "/static/external-auth/qq-logo.svg";
		case "linuxdo":
			return "/static/external-auth/linuxdo-logo.svg";
		case "oidc":
			return "/static/external-auth/openid-seeklogo.svg";
		default:
			return "/static/external-auth/default-logo.svg";
	}
}

export function normalizeExternalAuthIconUrl(value: string | null | undefined) {
	const trimmed = value?.trim();
	if (!trimmed) return "";
	if (!SAFE_EXTERNAL_AUTH_ICON_URL_PATTERN.test(trimmed)) return "";
	try {
		if (trimmed.startsWith("/")) {
			const parsed = new URL(
				trimmed,
				globalThis.location?.origin ?? "http://localhost",
			);
			if (parsed.hash) return "";
			return trimmed;
		}
		const parsed = new URL(trimmed);
		return parsed.hash ? "" : trimmed;
	} catch {
		return "";
	}
}

import type { TFunction } from "i18next";

export { formatDateTime } from "@/lib/dateTime";

import {
	externalAuthKindIconPath,
	normalizeExternalAuthIconUrl,
} from "@/lib/externalAuthProviders";
import { emptyToNull, emptyToUndefined } from "@/lib/form";
import { cn } from "@/lib/utils";
import type {
	AdminExternalAuthProviderInfo,
	CreateExternalAuthProviderRequest,
	ExternalAuthKind,
	ExternalAuthProviderKindInfo,
	ExternalAuthProviderTestParamsRequest,
	ExternalAuthProviderTestResult,
	UpdateExternalAuthProviderRequest,
} from "@/types/api";

export const EXTERNAL_AUTH_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_EXTERNAL_AUTH_PAGE_SIZE = 20 as const;
export const DEFAULT_SCOPES = "openid profile email";

export interface ExternalAuthProviderFormData {
	authorizationUrl: string;
	clientId: string;
	clientSecret: string;
	displayName: string;
	enabled: boolean;
	iconUrl: string;
	issuerUrl: string;
	key: string;
	providerKind: ExternalAuthKind;
	scopes: string;
	tokenUrl: string;
	userinfoUrl: string;
}

export type ExternalAuthProviderFieldChange = <
	K extends keyof ExternalAuthProviderFormData,
>(
	key: K,
	value: ExternalAuthProviderFormData[K],
) => void;

export interface ExternalAuthCreateStep {
	description: string;
	title: string;
}

export const emptyExternalAuthForm: ExternalAuthProviderFormData = {
	authorizationUrl: "",
	clientId: "",
	clientSecret: "",
	displayName: "",
	enabled: true,
	iconUrl: "",
	issuerUrl: "",
	key: "",
	providerKind: "oidc",
	scopes: DEFAULT_SCOPES,
	tokenUrl: "",
	userinfoUrl: "",
};

export function kindDisplayName(
	t: TFunction,
	kind: ExternalAuthKind,
	providerKinds: ExternalAuthProviderKindInfo[],
) {
	const fallback =
		providerKinds.find((item) => item.kind === kind)?.display_name ??
		kindFallbackLabel(kind);
	return t(`admin.externalAuth.kind.${kind}`, { defaultValue: fallback });
}

export function kindDescription(
	t: TFunction,
	kind: ExternalAuthProviderKindInfo,
) {
	return t(`admin.externalAuth.kindDesc.${kind.kind}`, {
		defaultValue: kind.description,
	});
}

export function defaultScopesForKind(
	kind?: ExternalAuthProviderKindInfo | null,
) {
	return kind?.default_scopes || DEFAULT_SCOPES;
}

function kindFallbackLabel(kind: ExternalAuthKind) {
	switch (kind) {
		case "generic_oauth2":
			return "Generic OAuth2";
		case "github":
			return "GitHub";
		case "google":
			return "Google";
		case "microsoft":
			return "Microsoft";
		case "qq":
			return "QQ";
		case "oidc":
			return "OpenID Connect";
	}
}

function providerKindValue(
	kind: ExternalAuthKind | ExternalAuthProviderKindInfo | null | undefined,
) {
	return typeof kind === "string" ? kind : kind?.kind;
}

export function isSpecializedProviderKind(
	kind: ExternalAuthKind | ExternalAuthProviderKindInfo | null | undefined,
) {
	const value = providerKindValue(kind);
	return (
		value === "github" ||
		value === "google" ||
		value === "microsoft" ||
		value === "qq"
	);
}

export function providerUsesFixedConnection(
	kind: ExternalAuthKind | ExternalAuthProviderKindInfo | null | undefined,
	descriptor?: ExternalAuthProviderKindInfo | null,
) {
	if (descriptor && descriptor.kind === providerKindValue(kind)) {
		return (
			!descriptor.issuer_url_required &&
			!descriptor.manual_endpoint_configuration_supported
		);
	}
	return isSpecializedProviderKind(kind);
}

export function shouldShowIssuerUrl(
	kind: ExternalAuthProviderKindInfo | null | undefined,
) {
	return Boolean(
		kind?.issuer_url_required && !providerUsesFixedConnection(kind),
	);
}

export function shouldShowManualEndpoints(
	kind: ExternalAuthProviderKindInfo | null | undefined,
) {
	return Boolean(
		kind?.manual_endpoint_configuration_supported &&
			!providerUsesFixedConnection(kind),
	);
}

export function sortExternalAuthProviderKinds(
	kinds: ExternalAuthProviderKindInfo[],
) {
	const order: Record<ExternalAuthKind, number> = {
		oidc: 0,
		generic_oauth2: 1,
		github: 2,
		google: 3,
		microsoft: 4,
		qq: 5,
	};
	return kinds.toSorted((left, right) => order[left.kind] - order[right.kind]);
}

export function formFromProvider(
	provider: AdminExternalAuthProviderInfo,
): ExternalAuthProviderFormData {
	return {
		authorizationUrl: provider.authorization_url ?? "",
		clientId: provider.client_id,
		clientSecret: provider.client_secret ?? "",
		displayName: provider.display_name,
		enabled: provider.enabled,
		iconUrl: provider.icon_url ?? "",
		issuerUrl: provider.issuer_url ?? "",
		key: provider.key,
		providerKind: provider.provider_kind,
		scopes: provider.scopes || DEFAULT_SCOPES,
		tokenUrl: provider.token_url ?? "",
		userinfoUrl: provider.userinfo_url ?? "",
	};
}

export function createPayload(
	form: ExternalAuthProviderFormData,
	kind?: ExternalAuthProviderKindInfo | null,
): CreateExternalAuthProviderRequest {
	return {
		authorization_url: createConnectionValue(form, form.authorizationUrl, kind),
		client_id: form.clientId.trim(),
		client_secret: emptyToNull(form.clientSecret),
		display_name: form.displayName.trim(),
		enabled: form.enabled,
		icon_url: emptyToNull(form.iconUrl),
		issuer_url: createConnectionValue(form, form.issuerUrl, kind),
		provider_kind: form.providerKind,
		scopes: createScopesValue(form, kind),
		token_url: createConnectionValue(form, form.tokenUrl, kind),
		userinfo_url: createConnectionValue(form, form.userinfoUrl, kind),
	};
}

export function updatePayload(
	form: ExternalAuthProviderFormData,
	kind?: ExternalAuthProviderKindInfo | null,
): UpdateExternalAuthProviderRequest {
	return {
		authorization_url: updateConnectionValue(form, form.authorizationUrl, kind),
		client_id: emptyToUndefined(form.clientId),
		client_secret: emptyToUndefined(form.clientSecret),
		display_name: emptyToUndefined(form.displayName),
		enabled: form.enabled,
		icon_url: emptyToUndefined(form.iconUrl),
		issuer_url: updateConnectionValue(form, form.issuerUrl, kind),
		scopes: updateScopesValue(form, kind),
		token_url: updateConnectionValue(form, form.tokenUrl, kind),
		userinfo_url: updateConnectionValue(form, form.userinfoUrl, kind),
	};
}

export function testParamsPayload(
	form: ExternalAuthProviderFormData,
	kind?: ExternalAuthProviderKindInfo | null,
): ExternalAuthProviderTestParamsRequest {
	return {
		authorization_url: createConnectionValue(form, form.authorizationUrl, kind),
		client_id: form.clientId.trim(),
		client_secret: emptyToNull(form.clientSecret),
		issuer_url: createConnectionValue(form, form.issuerUrl, kind),
		provider_kind: form.providerKind,
		scopes: createScopesValue(form, kind),
		token_url: createConnectionValue(form, form.tokenUrl, kind),
		userinfo_url: createConnectionValue(form, form.userinfoUrl, kind),
	};
}

function createScopesValue(
	form: ExternalAuthProviderFormData,
	kind?: ExternalAuthProviderKindInfo | null,
) {
	if (providerUsesFixedConnection(form.providerKind, kind)) {
		return null;
	}
	return emptyToNull(form.scopes);
}

function updateScopesValue(
	form: ExternalAuthProviderFormData,
	kind?: ExternalAuthProviderKindInfo | null,
) {
	if (providerUsesFixedConnection(form.providerKind, kind)) {
		return undefined;
	}
	return emptyToUndefined(form.scopes);
}

function createConnectionValue(
	form: ExternalAuthProviderFormData,
	value: string,
	kind?: ExternalAuthProviderKindInfo | null,
) {
	if (providerUsesFixedConnection(form.providerKind, kind)) {
		return null;
	}
	return emptyToNull(value);
}

function updateConnectionValue(
	form: ExternalAuthProviderFormData,
	value: string,
	kind?: ExternalAuthProviderKindInfo | null,
) {
	if (providerUsesFixedConnection(form.providerKind, kind)) {
		return undefined;
	}
	return emptyToUndefined(value);
}

export function callbackUrl(provider: AdminExternalAuthProviderInfo) {
	const origin = typeof window === "undefined" ? "" : window.location.origin;
	return provider.key
		? `${origin}/api/v1/auth/external-auth/${encodeURIComponent(provider.provider_kind)}/${encodeURIComponent(provider.key)}/callback`
		: "";
}

export function requiredFieldsMissing(
	form: ExternalAuthProviderFormData,
	kind: ExternalAuthProviderKindInfo | null,
) {
	if (!form.displayName.trim() || !form.clientId.trim()) return true;
	if (kind?.issuer_url_required && !form.issuerUrl.trim()) return true;
	if (kind?.authorization_url_required && !form.authorizationUrl.trim()) {
		return true;
	}
	if (kind?.token_url_required && !form.tokenUrl.trim()) return true;
	if (kind?.userinfo_url_required && !form.userinfoUrl.trim()) return true;
	return false;
}

export function connectionRequirementsMissing(
	form: ExternalAuthProviderFormData,
	kind: ExternalAuthProviderKindInfo | null,
) {
	if (!form.clientId.trim()) return true;
	if (kind?.issuer_url_required && !form.issuerUrl.trim()) return true;
	if (kind?.authorization_url_required && !form.authorizationUrl.trim()) {
		return true;
	}
	if (kind?.token_url_required && !form.tokenUrl.trim()) return true;
	if (kind?.userinfo_url_required && !form.userinfoUrl.trim()) return true;
	return false;
}

export function primaryEndpoint(provider: AdminExternalAuthProviderInfo) {
	if (provider.issuer_url) {
		return provider.issuer_url;
	}
	return (
		provider.authorization_url ??
		provider.userinfo_url ??
		provider.token_url ??
		""
	);
}

export function formatTestResult(
	t: TFunction,
	result: ExternalAuthProviderTestResult,
) {
	const failed = result.checks.filter((check) => !check.success).length;
	const total = result.checks.length;
	return failed === 0
		? t("admin.externalAuth.testSuccess", { count: total })
		: t("admin.externalAuth.testPartial", { failed, total });
}

export function ExternalAuthProviderIcon({
	className,
	iconUrl,
	kind,
}: {
	className?: string;
	iconUrl?: string | null;
	kind: ExternalAuthKind;
}) {
	const configuredIcon = normalizeExternalAuthIconUrl(iconUrl);
	const kindIcon = externalAuthKindIconPath(kind);
	const iconPath = configuredIcon || kindIcon;

	return (
		<img
			src={iconPath}
			alt=""
			aria-hidden="true"
			className={cn("object-contain", className)}
			onError={(event) => {
				if (
					configuredIcon &&
					event.currentTarget.dataset.fallbackTried !== "1"
				) {
					event.currentTarget.dataset.fallbackTried = "1";
					event.currentTarget.src = kindIcon;
				}
			}}
		/>
	);
}

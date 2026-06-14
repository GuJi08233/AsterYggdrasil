import { describe, expect, it } from "vitest";
import { normalizeExternalAuthIconUrl } from "@/lib/externalAuthProviders";
import type { ExternalAuthProviderKindInfo } from "@/types/api";
import {
	createPayload,
	type ExternalAuthProviderFormData,
	testParamsPayload,
	updatePayload,
} from "./shared";

function providerKind(
	kind: ExternalAuthProviderKindInfo["kind"],
	overrides: Partial<ExternalAuthProviderKindInfo> = {},
): ExternalAuthProviderKindInfo {
	return {
		authorization_url_required: false,
		default_scopes: "openid profile email",
		description: kind,
		display_name: kind,
		issuer_url_required: false,
		kind,
		manual_endpoint_configuration_supported: false,
		protocol: kind === "github" || kind === "qq" ? "oauth2" : "oidc",
		supports_discovery: false,
		supports_email_verified_claim: true,
		supports_pkce: true,
		token_url_required: false,
		userinfo_url_required: false,
		...overrides,
	};
}

function form(
	overrides: Partial<ExternalAuthProviderFormData> = {},
): ExternalAuthProviderFormData {
	return {
		authorizationUrl: "https://id.example.com/oauth/authorize",
		clientId: "client-id",
		clientSecret: "secret",
		displayName: "Provider",
		enabled: true,
		iconUrl: "https://cdn.example.com/provider.svg",
		issuerUrl: "https://id.example.com",
		key: "provider",
		providerKind: "github",
		scopes: "custom scope",
		tokenUrl: "https://id.example.com/oauth/token",
		userinfoUrl: "https://id.example.com/oauth/userinfo",
		...overrides,
	};
}

describe("external auth provider shared helpers", () => {
	it("omits configurable URLs and scopes for fixed provider kinds", () => {
		const kind = providerKind("github");
		const create = createPayload(form(), kind);
		const test = testParamsPayload(form(), kind);
		const update = updatePayload(form(), kind);

		expect(create).toMatchObject({
			authorization_url: null,
			issuer_url: null,
			scopes: null,
			token_url: null,
			userinfo_url: null,
		});
		expect(test).toMatchObject({
			authorization_url: null,
			issuer_url: null,
			scopes: null,
			token_url: null,
			userinfo_url: null,
		});
		expect(create).not.toHaveProperty("key");
		expect(create).toMatchObject({
			icon_url: "https://cdn.example.com/provider.svg",
			provider_kind: "github",
		});
		expect(JSON.stringify(update)).not.toContain("authorization_url");
		expect(JSON.stringify(update)).not.toContain("issuer_url");
		expect(JSON.stringify(update)).not.toContain("scopes");
		expect(JSON.stringify(update)).not.toContain("token_url");
		expect(JSON.stringify(update)).not.toContain("userinfo_url");
		expect(update).not.toHaveProperty("key");
		expect(update).not.toHaveProperty("provider_kind");
	});

	it("keeps configurable URLs and scopes for generic OAuth2", () => {
		const kind = providerKind("generic_oauth2", {
			authorization_url_required: true,
			manual_endpoint_configuration_supported: true,
			protocol: "oauth2",
			token_url_required: true,
			userinfo_url_required: true,
		});
		const payload = createPayload(
			form({ providerKind: "generic_oauth2" }),
			kind,
		);

		expect(payload).toMatchObject({
			authorization_url: "https://id.example.com/oauth/authorize",
			icon_url: "https://cdn.example.com/provider.svg",
			provider_kind: "generic_oauth2",
			scopes: "custom scope",
			token_url: "https://id.example.com/oauth/token",
			userinfo_url: "https://id.example.com/oauth/userinfo",
		});
	});

	it("serializes blank optional values as nullable create fields and omitted update fields", () => {
		const kind = providerKind("oidc", {
			issuer_url_required: true,
			supports_discovery: true,
		});
		const blankForm = form({
			clientSecret: " ",
			iconUrl: " ",
			issuerUrl: " https://id.example.com ",
			providerKind: "oidc",
			scopes: " ",
		});
		const create = createPayload(blankForm, kind);
		const update = updatePayload(blankForm, kind);

		expect(create).toMatchObject({
			client_secret: null,
			icon_url: null,
			issuer_url: "https://id.example.com",
			scopes: null,
		});
		expect(update).toMatchObject({
			client_secret: undefined,
			icon_url: undefined,
			issuer_url: "https://id.example.com",
			scopes: undefined,
		});
		expect(JSON.stringify(update)).not.toContain("client_secret");
		expect(JSON.stringify(update)).not.toContain("icon_url");
		expect(JSON.stringify(update)).not.toContain("scopes");
	});

	it("normalizes external auth icon URLs with safe boundary rules", () => {
		expect(
			normalizeExternalAuthIconUrl(" https://cdn.example.com/a.svg "),
		).toBe("https://cdn.example.com/a.svg");
		expect(normalizeExternalAuthIconUrl("/static/external-auth/a.svg")).toBe(
			"/static/external-auth/a.svg",
		);

		expect(normalizeExternalAuthIconUrl(null)).toBe("");
		expect(normalizeExternalAuthIconUrl("")).toBe("");
		expect(normalizeExternalAuthIconUrl("http://cdn.example.com/a.svg")).toBe(
			"",
		);
		expect(normalizeExternalAuthIconUrl("//cdn.example.com/a.svg")).toBe("");
		expect(normalizeExternalAuthIconUrl("static/external-auth/a.svg")).toBe("");
		expect(normalizeExternalAuthIconUrl("javascript:alert(1)")).toBe("");
		expect(
			normalizeExternalAuthIconUrl("https://cdn.example.com/a.svg#v1"),
		).toBe("");
		expect(normalizeExternalAuthIconUrl("/static/external-auth/a.svg#v1")).toBe(
			"",
		);
	});
});

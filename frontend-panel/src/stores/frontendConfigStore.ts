import { create } from "zustand";
import {
	type AppliedBranding,
	applyBranding,
	DEFAULT_BRANDING,
	resolveBranding,
} from "@/lib/branding";
import { frontendConfigService } from "@/services/frontendConfigService";
import type {
	PublicBranding,
	PublicFrontendConfig,
	PublicYggdrasilConfig,
} from "@/types/api";

export const FRONTEND_CONFIG_CACHE_KEY =
	"asteryggdrasil-cached-frontend-config:v1";
const FRONTEND_CONFIG_REVALIDATE_INTERVAL_MS = 30_000;

interface CachedFrontendConfigPayload {
	config: PublicFrontendConfig;
	cachedAt?: number;
}

interface FrontendConfigState {
	allowUserRegistration: boolean;
	passkeyLoginEnabled: boolean;
	branding: AppliedBranding;
	config: PublicFrontendConfig | null;
	isLoaded: boolean;
	yggdrasil: PublicYggdrasilConfig | null;
	invalidate: () => void;
	load: (options?: { force?: boolean }) => Promise<void>;
}

let inFlightLoad: Promise<void> | null = null;
let lastRevalidationAttemptAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function publicPasskeyLoginEnabled(branding: PublicBranding | null): boolean {
	if (!branding || !isRecord(branding)) return true;
	return branding.passkey_login_enabled !== false;
}

function isPublicBranding(value: unknown): value is PublicBranding {
	return (
		isRecord(value) &&
		typeof value.allow_user_registration === "boolean" &&
		(value.passkey_login_enabled === undefined ||
			typeof value.passkey_login_enabled === "boolean") &&
		typeof value.description === "string" &&
		typeof value.favicon_url === "string" &&
		isStringArray(value.site_urls) &&
		typeof value.title === "string" &&
		typeof value.wordmark_dark_url === "string" &&
		typeof value.wordmark_light_url === "string"
	);
}

function isPublicYggdrasilConfig(
	value: unknown,
): value is PublicYggdrasilConfig {
	return (
		isRecord(value) &&
		typeof value.allow_cape_upload === "boolean" &&
		typeof value.allow_profile_name_login === "boolean" &&
		typeof value.allow_skin_upload === "boolean" &&
		isStringArray(value.public_base_urls) &&
		typeof value.server_name === "string" &&
		isStringArray(value.skin_domains)
	);
}

function isFrontendConfig(value: unknown): value is PublicFrontendConfig {
	return (
		isRecord(value) &&
		typeof value.version === "number" &&
		Number.isFinite(value.version) &&
		isPublicBranding(value.branding) &&
		isPublicYggdrasilConfig(value.yggdrasil)
	);
}

function readCachedFrontendConfig(): CachedFrontendConfigPayload | null {
	if (typeof window === "undefined") return null;

	try {
		const raw = localStorage.getItem(FRONTEND_CONFIG_CACHE_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as CachedFrontendConfigPayload | null;
		if (!isRecord(parsed) || !isFrontendConfig(parsed.config)) {
			localStorage.removeItem(FRONTEND_CONFIG_CACHE_KEY);
			return null;
		}

		return {
			config: parsed.config,
			cachedAt:
				typeof parsed.cachedAt === "number" && Number.isFinite(parsed.cachedAt)
					? parsed.cachedAt
					: 0,
		};
	} catch {
		try {
			localStorage.removeItem(FRONTEND_CONFIG_CACHE_KEY);
		} catch {
			// ignore storage failures
		}
		return null;
	}
}

function writeCachedFrontendConfig(config: PublicFrontendConfig) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(
			FRONTEND_CONFIG_CACHE_KEY,
			JSON.stringify({
				config,
				cachedAt: Date.now(),
			} satisfies CachedFrontendConfigPayload),
		);
	} catch {
		// ignore storage failures
	}
}

function clearCachedFrontendConfig() {
	if (typeof window === "undefined") return;

	try {
		localStorage.removeItem(FRONTEND_CONFIG_CACHE_KEY);
	} catch {
		// ignore storage failures
	}
}

function applyFrontendConfig(config: PublicFrontendConfig) {
	const branding = resolveBranding(config.branding);
	applyBranding(branding);
	return {
		allowUserRegistration: config.branding.allow_user_registration,
		passkeyLoginEnabled: publicPasskeyLoginEnabled(config.branding),
		branding,
		config,
		isLoaded: true,
		yggdrasil: config.yggdrasil,
	};
}

function fallbackState() {
	applyBranding(DEFAULT_BRANDING);
	return {
		allowUserRegistration: true,
		passkeyLoginEnabled: true,
		branding: DEFAULT_BRANDING,
		config: null,
		isLoaded: true,
		yggdrasil: null,
	};
}

function shouldSkipRevalidation(force: boolean, isLoaded: boolean) {
	if (force || !isLoaded) return false;
	return (
		Date.now() - lastRevalidationAttemptAt <
		FRONTEND_CONFIG_REVALIDATE_INTERVAL_MS
	);
}

const initialCachedPayload = readCachedFrontendConfig();
const initialCachedConfig = initialCachedPayload?.config ?? null;
const initialBranding = resolveBranding(initialCachedConfig?.branding ?? null);

export const useFrontendConfigStore = create<FrontendConfigState>(
	(set, get) => ({
		allowUserRegistration:
			initialCachedConfig?.branding.allow_user_registration ?? true,
		passkeyLoginEnabled: publicPasskeyLoginEnabled(
			initialCachedConfig?.branding ?? null,
		),
		branding: initialBranding,
		config: initialCachedConfig,
		isLoaded: initialCachedConfig !== null,
		yggdrasil: initialCachedConfig?.yggdrasil ?? null,

		invalidate: () => {
			clearCachedFrontendConfig();
			lastRevalidationAttemptAt = 0;
			set({
				allowUserRegistration: true,
				passkeyLoginEnabled: true,
				branding: DEFAULT_BRANDING,
				config: null,
				isLoaded: false,
				yggdrasil: null,
			});
		},

		load: async ({ force = false } = {}) => {
			if (shouldSkipRevalidation(force, get().isLoaded)) return;
			if (inFlightLoad) return inFlightLoad;

			inFlightLoad = (async () => {
				lastRevalidationAttemptAt = Date.now();
				try {
					const config = await frontendConfigService.get();
					if (!isFrontendConfig(config)) {
						throw new Error("invalid frontend config response");
					}
					writeCachedFrontendConfig(config);
					set(applyFrontendConfig(config));
				} catch (error) {
					console.warn(
						"frontend config bootstrap failed, using cached/defaults",
						error,
					);
					if (get().isLoaded) return;
					set(fallbackState());
				} finally {
					inFlightLoad = null;
				}
			})();

			return inFlightLoad;
		},
	}),
);

export function initFrontendConfigRuntime() {
	if (typeof window === "undefined") return;
	applyBranding(initialBranding);
}

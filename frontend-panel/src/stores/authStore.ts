import { create } from "zustand";
import { authService } from "@/services/authService";
import type {
	AdminUserInfo,
	AuthTokenResponse,
	AuthUserInfo,
	UpdateAvatarSourceRequest,
	UpdateProfileRequest,
	UserProfileInfo,
} from "@/types/api";

const CACHED_USER_KEY = "asteryggdrasil-cached-user";
const LEGACY_USER_KEY = "asteryggdrasil-user";
const EXPIRES_AT_KEY = "asteryggdrasil-auth-expires-at";
const LEGACY_ACCESS_TOKEN_KEY = "asteryggdrasil-access-token";
const LEGACY_REFRESH_TOKEN_KEY = "asteryggdrasil-refresh-token";

type CachedAuthUser = Pick<
	AuthUserInfo,
	"id" | "profile" | "role" | "status" | "username"
>;

type AuthState = {
	user: AuthUserInfo | null;
	checking: boolean;
	error: string | null;
	expiresAt: number | null;
	isAuthStale: boolean;
	isAuthenticated: boolean;
	isAdmin: boolean;
	hydrate: () => Promise<void>;
	setup: (
		username: string,
		email: string,
		password: string,
		publicSiteUrl?: string,
	) => Promise<void>;
	register: (
		username: string,
		email: string,
		password: string,
	) => Promise<void>;
	login: (identifier: string, password: string) => Promise<void>;
	loginWithPasskey: (flowId: string, credential: unknown) => Promise<void>;
	refreshUser: () => Promise<void>;
	updateProfile: (data: UpdateProfileRequest) => Promise<UserProfileInfo>;
	setAvatarSource: (
		data: UpdateAvatarSourceRequest,
	) => Promise<UserProfileInfo>;
	uploadAvatar: (file: File) => Promise<UserProfileInfo>;
	syncCurrentUserFromAdminUser: (user: AdminUserInfo) => void;
	refresh: () => Promise<void>;
	logout: () => Promise<void>;
	clear: () => void;
};

let inFlightHydrate: Promise<void> | null = null;

function defaultUserProfile(): UserProfileInfo {
	return {
		display_name: null,
		avatar: {
			source: "none",
			url_1024: null,
			url_512: null,
			version: 0,
		},
	};
}

function sanitizeCachedUser(value: unknown): CachedAuthUser | null {
	if (!value || typeof value !== "object") return null;
	const source = value as Partial<AuthUserInfo>;
	if (
		typeof source.id !== "number" ||
		typeof source.username !== "string" ||
		typeof source.role !== "string" ||
		typeof source.status !== "string"
	) {
		return null;
	}
	return {
		id: source.id,
		profile: source.profile ?? defaultUserProfile(),
		username: source.username,
		role: source.role,
		status: source.status,
	} as CachedAuthUser;
}

function cachedUserToAuthUser(user: CachedAuthUser): AuthUserInfo {
	return {
		...user,
		email: "",
		profile: user.profile ?? defaultUserProfile(),
	};
}

function readStoredUser(): AuthUserInfo | null {
	try {
		const raw =
			localStorage.getItem(CACHED_USER_KEY) ??
			localStorage.getItem(LEGACY_USER_KEY);
		if (!raw) return null;

		const cached = sanitizeCachedUser(JSON.parse(raw));
		if (!cached) {
			localStorage.removeItem(CACHED_USER_KEY);
			localStorage.removeItem(LEGACY_USER_KEY);
			return null;
		}

		localStorage.setItem(CACHED_USER_KEY, JSON.stringify(cached));
		localStorage.removeItem(LEGACY_USER_KEY);
		return cachedUserToAuthUser(cached);
	} catch {
		return null;
	}
}

function persistUser(user: AuthUserInfo | null) {
	try {
		const cached = sanitizeCachedUser(user);
		if (cached) {
			localStorage.setItem(CACHED_USER_KEY, JSON.stringify(cached));
			localStorage.removeItem(LEGACY_USER_KEY);
			return;
		}
		localStorage.removeItem(CACHED_USER_KEY);
		localStorage.removeItem(LEGACY_USER_KEY);
	} catch {
		// Storage can be unavailable in private contexts; auth still relies on cookies.
	}
}

function readStoredExpiresAt(): number | null {
	try {
		const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
		if (!raw) return null;
		const expiresAt = Number(raw);
		if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
			sessionStorage.removeItem(EXPIRES_AT_KEY);
			return null;
		}
		return expiresAt;
	} catch {
		return null;
	}
}

function persistExpiresAt(expiresAt: number | null) {
	try {
		if (expiresAt === null) {
			sessionStorage.removeItem(EXPIRES_AT_KEY);
			return;
		}
		sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
	} catch {
		// Storage failures should not break cookie-backed auth.
	}
}

function expiresAtFromToken(response: AuthTokenResponse): number | null {
	const expiresIn = Number(response.expires_in);
	if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
		return null;
	}
	return Date.now() + expiresIn * 1000;
}

function persistSession(response: AuthTokenResponse): number | null {
	const expiresAt = expiresAtFromToken(response);
	persistExpiresAt(expiresAt);
	return expiresAt;
}

function clearPersistedAuth() {
	clearLegacyTokenStorage();
	persistUser(null);
	persistExpiresAt(null);
}

function authStateFromUser(user: AuthUserInfo | null) {
	return {
		user,
		...deriveAuthFlags(user),
	};
}

function setAuthenticatedState(
	set: (state: Partial<AuthState>) => void,
	user: AuthUserInfo,
	expiresAt: number | null,
) {
	persistUser(user);
	if (expiresAt !== null) {
		persistExpiresAt(expiresAt);
	}
	set({
		...authStateFromUser(user),
		checking: false,
		error: null,
		expiresAt,
		isAuthStale: false,
	});
}

async function syncUserAfterTokenResponse(
	set: (state: Partial<AuthState>) => void,
	response: AuthTokenResponse,
) {
	const expiresAt = persistSession(response);
	const user = await authService.me();
	setAuthenticatedState(set, user, expiresAt);
}

function syncProfile(
	set: (state: Partial<AuthState>) => void,
	get: () => AuthState,
	profile: UserProfileInfo,
) {
	const currentUser = get().user;
	if (!currentUser) return;
	setAuthenticatedState(
		set,
		{ ...currentUser, profile },
		get().expiresAt ?? readStoredExpiresAt(),
	);
}

function syncAdminUser(
	set: (state: Partial<AuthState>) => void,
	get: () => AuthState,
	adminUser: AdminUserInfo,
) {
	const currentUser = get().user;
	if (!currentUser || currentUser.id !== adminUser.id) return;
	setAuthenticatedState(
		set,
		{
			...currentUser,
			email: adminUser.email,
			profile: adminUser.profile,
			role: adminUser.role,
			status: adminUser.status,
			username: adminUser.username,
		},
		get().expiresAt ?? readStoredExpiresAt(),
	);
}

function clearLegacyTokenStorage() {
	try {
		localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
		localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
	} catch {
		// ignore storage failures
	}
}

function deriveAuthFlags(user: AuthUserInfo | null) {
	return {
		isAuthenticated: Boolean(user),
		isAdmin: user?.role === "admin",
	};
}

const initialUser = readStoredUser();
const initialFlags = deriveAuthFlags(initialUser);
const initialExpiresAt = readStoredExpiresAt();
clearLegacyTokenStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
	user: initialUser,
	checking: true,
	error: null,
	expiresAt: initialExpiresAt,
	isAuthStale: Boolean(initialUser),
	isAuthenticated: initialFlags.isAuthenticated,
	isAdmin: initialFlags.isAdmin,
	async hydrate() {
		if (inFlightHydrate) return inFlightHydrate;

		inFlightHydrate = (async () => {
			set({ checking: true, error: null });
			try {
				const user = await authService.me();
				setAuthenticatedState(
					set,
					user,
					get().expiresAt ?? readStoredExpiresAt(),
				);
			} catch (error) {
				clearPersistedAuth();
				set({
					...authStateFromUser(null),
					checking: false,
					error:
						error instanceof Error ? error.message : "Session check failed",
					expiresAt: null,
					isAuthStale: false,
				});
			} finally {
				inFlightHydrate = null;
			}
		})();

		return inFlightHydrate;
	},
	async setup(username, email, password, publicSiteUrl) {
		const response = await authService.setup({
			username,
			email,
			password,
			public_site_url: publicSiteUrl,
		});
		await syncUserAfterTokenResponse(set, response);
	},
	async register(username, email, password) {
		const response = await authService.register({ username, email, password });
		await syncUserAfterTokenResponse(set, response);
	},
	async login(identifier, password) {
		const response = await authService.login({ identifier, password });
		await syncUserAfterTokenResponse(set, response);
	},
	async loginWithPasskey(flowId, credential) {
		const response = await authService.finishPasskeyLogin(flowId, credential);
		await syncUserAfterTokenResponse(set, response);
	},
	async refreshUser() {
		const user = await authService.me();
		setAuthenticatedState(set, user, get().expiresAt ?? readStoredExpiresAt());
	},
	async updateProfile(data) {
		const profile = await authService.updateProfile(data);
		syncProfile(set, get, profile);
		return profile;
	},
	async setAvatarSource(data) {
		const profile = await authService.setAvatarSource(data);
		syncProfile(set, get, profile);
		return profile;
	},
	async uploadAvatar(file) {
		const profile = await authService.uploadAvatar(file);
		syncProfile(set, get, profile);
		return profile;
	},
	syncCurrentUserFromAdminUser(user) {
		syncAdminUser(set, get, user);
	},
	async refresh() {
		const response = await authService.refresh();
		const expiresAt = persistSession(response);
		const user = await authService.me();
		setAuthenticatedState(set, user, expiresAt);
	},
	async logout() {
		try {
			await authService.logout();
		} finally {
			get().clear();
		}
	},
	clear() {
		clearPersistedAuth();
		set({
			...authStateFromUser(null),
			error: null,
			checking: false,
			expiresAt: null,
			isAuthStale: false,
		});
	},
}));

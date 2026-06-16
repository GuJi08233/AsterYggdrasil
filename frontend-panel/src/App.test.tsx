import { fireEvent, render, screen, within } from "@testing-library/react";
import {
	createMemoryRouter,
	MemoryRouter,
	Outlet,
	RouterProvider,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginDevicesSection } from "@/components/settings/LoginDevicesSection";
import AccountSettingsPage from "@/pages/account/AccountSettingsPage";
import InitPage from "@/pages/InitPage";
import LoginPage from "@/pages/LoginPage";
import PublicConnectPage from "@/pages/PublicConnectPage";
import { RequireInitialized } from "@/router/InitStatusGate";
import { LoginGuard } from "@/router/LoginGuard";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import { useInitStatusStore } from "@/stores/initStatusStore";
import type {
	AuthSessionInfo,
	AuthSessionPage,
	PasskeyPage,
} from "@/types/api";

const authServiceMock = vi.hoisted(() => ({
	check: vi.fn(),
	me: vi.fn(),
	login: vi.fn(),
	register: vi.fn(),
	setup: vi.fn(),
	logout: vi.fn(),
	sessions: vi.fn(),
	sessionsPage: vi.fn(),
	revokeSession: vi.fn(),
	revokeOtherSessions: vi.fn(),
	listPasskeys: vi.fn(),
	listPasskeysPage: vi.fn(),
	startPasskeyRegistration: vi.fn(),
	finishPasskeyRegistration: vi.fn(),
	renamePasskey: vi.fn(),
	deletePasskey: vi.fn(),
	startPasskeyLogin: vi.fn(),
	finishPasskeyLogin: vi.fn(),
}));

const yggdrasilServiceMock = vi.hoisted(() => ({
	metadata: vi.fn(),
	listProfiles: vi.fn(),
}));

function sessionsPage(items: AuthSessionInfo[]): AuthSessionPage {
	return {
		items,
		limit: 50,
		offset: 0,
		total: items.length,
	};
}

function passkeyPage(items: PasskeyPage["items"]): PasskeyPage {
	return {
		items,
		limit: 20,
		offset: 0,
		total: items.length,
	};
}

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("@/services/yggdrasilService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/yggdrasilService")>();
	return {
		...actual,
		yggdrasilService: {
			...actual.yggdrasilService,
			metadata: yggdrasilServiceMock.metadata,
			listProfiles: yggdrasilServiceMock.listProfiles,
		},
	};
});

describe("frontend entry routes", () => {
	beforeEach(() => {
		useAuthStore.getState().clear();
		useFrontendConfigStore.getState().invalidate();
		useInitStatusStore.getState().reset();
		authServiceMock.check.mockResolvedValue({ initialized: true });
		authServiceMock.me.mockRejectedValue(new Error("unauthenticated"));
		authServiceMock.login.mockResolvedValue(undefined);
		authServiceMock.register.mockResolvedValue(undefined);
		authServiceMock.setup.mockResolvedValue(undefined);
		authServiceMock.logout.mockResolvedValue(undefined);
		authServiceMock.sessions.mockResolvedValue([]);
		authServiceMock.sessionsPage.mockResolvedValue(sessionsPage([]));
		authServiceMock.revokeSession.mockResolvedValue(undefined);
		authServiceMock.revokeOtherSessions.mockResolvedValue({ removed: 0 });
		authServiceMock.listPasskeys.mockResolvedValue([]);
		authServiceMock.listPasskeysPage.mockResolvedValue(passkeyPage([]));
		authServiceMock.startPasskeyRegistration.mockResolvedValue({
			flow_id: "flow-1",
			public_key: {},
		});
		authServiceMock.finishPasskeyRegistration.mockResolvedValue({
			backup_eligible: false,
			backed_up: false,
			created_at: "2026-06-15T00:00:00Z",
			id: 1,
			last_used_at: null,
			name: "MacBook",
			sign_count: 0,
			transports: null,
			updated_at: "2026-06-15T00:00:00Z",
		});
		authServiceMock.renamePasskey.mockImplementation(
			(id: number, payload: { name: string }) =>
				Promise.resolve({
					backup_eligible: false,
					backed_up: false,
					created_at: "2026-06-15T00:00:00Z",
					id,
					last_used_at: null,
					name: payload.name,
					sign_count: 0,
					transports: null,
					updated_at: "2026-06-15T00:00:00Z",
				}),
		);
		authServiceMock.deletePasskey.mockResolvedValue(undefined);
		authServiceMock.startPasskeyLogin.mockResolvedValue({
			flow_id: "login-flow-1",
			public_key: {},
		});
		authServiceMock.finishPasskeyLogin.mockResolvedValue({ expires_in: 3600 });
		yggdrasilServiceMock.metadata.mockResolvedValue({
			meta: {
				serverName: "AsterYggdrasil",
				implementationName: "AsterYggdrasil",
				implementationVersion: "0.1.0",
				feature: { non_email_login: true },
			},
			skinDomains: ["localhost"],
			signaturePublickey: "public-key",
		});
		yggdrasilServiceMock.listProfiles.mockResolvedValue([]);
	});

	it("renders the public Yggdrasil entry route from public frontend config", async () => {
		useFrontendConfigStore.setState({
			branding: {
				title: "AsterYggdrasil",
				description: "AsterYggdrasil public config",
				faviconUrl: "",
				wordmarkDarkUrl: "",
				wordmarkLightUrl: "",
			},
			config: {
				version: 1,
				branding: {
					title: "AsterYggdrasil",
					description: "AsterYggdrasil public config",
					favicon_url: "",
					wordmark_dark_url: "",
					wordmark_light_url: "",
					site_urls: ["http://localhost:5173"],
					allow_user_registration: true,
				},
				yggdrasil: {
					server_name: "AsterYggdrasil",
					skin_domains: ["localhost"],
					public_base_urls: ["http://localhost:5173"],
					allow_profile_name_login: true,
					allow_skin_upload: true,
					allow_cape_upload: true,
				},
			},
			isLoaded: true,
			yggdrasil: {
				server_name: "AsterYggdrasil",
				skin_domains: ["localhost"],
				public_base_urls: ["http://localhost:5173"],
				allow_profile_name_login: true,
				allow_skin_upload: true,
				allow_cape_upload: true,
			},
		});

		render(
			<MemoryRouter>
				<PublicConnectPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: /Your Minecraft identity and skin hub/,
			}),
		).toBeInTheDocument();
		expect(
			screen.getAllByText("AsterYggdrasil public config").length,
		).toBeGreaterThan(0);
		expect(screen.getByLabelText("Language")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Login / Register" }),
		).toHaveAttribute("href", "/login");
		expect(screen.getByRole("link", { name: /Get started/ })).toHaveAttribute(
			"href",
			"/login",
		);
		expect(
			screen.getByRole("link", { name: "Learn more" }),
		).toBeInTheDocument();
		expect(screen.getByText("Safe and reliable")).toBeInTheDocument();
		expect(screen.getByText("Skin management")).toBeInTheDocument();
		expect(screen.getByText("Fast and stable")).toBeInTheDocument();
		expect(screen.getByText("Server support")).toBeInTheDocument();
		expect(screen.getByText("Developer friendly")).toBeInTheDocument();
		expect(screen.getByText("Skin ecosystem")).toBeInTheDocument();
		expect(screen.getByText("Community driven")).toBeInTheDocument();
	});

	it("renders the public entry through the shared public shell", async () => {
		render(
			<MemoryRouter>
				<PublicConnectPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: /Your Minecraft identity and skin hub/,
			}),
		).toBeInTheDocument();

		const brandLink = within(screen.getByRole("banner")).getByRole("link", {
			name: /AsterYggdrasil.*Minecraft skin site and Yggdrasil authentication server/,
		});
		expect(brandLink).toHaveAttribute("href", "/");
		expect(brandLink.querySelector("img")).toHaveClass("size-10");

		expect(
			document.querySelector('[data-slot="public-entry-backdrop-image"]'),
		).toHaveClass("fixed", "inset-0", "bg-cover", "bg-center");
		expect(screen.getByLabelText("Language")).toHaveClass("size-10");
		expect(document.querySelector(".public-home-enter")).toBeInTheDocument();
		expect(
			document.querySelector(".app-route-transition"),
		).not.toBeInTheDocument();
	});

	it("shows console CTA on the public entry when authenticated", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "user",
			status: "active",
			profile: {
				display_name: null,
				avatar: {
					source: "none",
					url_512: null,
					url_1024: null,
					version: 0,
				},
			},
		} as const;
		authServiceMock.me.mockResolvedValue(user);
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: false,
		});

		render(
			<MemoryRouter>
				<PublicConnectPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("link", { name: /Enter console/ }),
		).toHaveAttribute("href", "/account");
		expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
		expect(screen.queryByText("Get started")).not.toBeInTheDocument();
	});

	it("renders the login form when auth check reports an initialized system", async () => {
		authServiceMock.check.mockResolvedValue({ initialized: true });

		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Login" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Email or username")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		const passwordInput = screen.getByLabelText("Password");
		expect(passwordInput).toHaveAttribute("type", "password");

		const revealButton = screen.getByRole("button", {
			name: "Show password",
		});
		expect(revealButton).toHaveClass("bg-transparent", "size-6");
		expect(revealButton).not.toHaveAttribute("data-slot", "button");

		fireEvent.click(revealButton);

		expect(passwordInput).toHaveAttribute("type", "text");
		expect(
			screen.getByRole("button", { name: "Hide password" }),
		).toBeInTheDocument();
	});

	it("renders login through the shared public shell while keeping page animation on the body", async () => {
		authServiceMock.check.mockResolvedValue({ initialized: true });

		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Login" }),
		).toBeInTheDocument();

		const brandLink = within(screen.getByRole("banner")).getByRole("link", {
			name: /AsterYggdrasil.*Minecraft skin site and Yggdrasil authentication server/,
		});
		expect(brandLink).toHaveAttribute("href", "/");
		expect(brandLink.querySelector("img")).toHaveClass("size-10");

		expect(
			document.querySelector('[data-slot="public-entry-backdrop-image"]'),
		).toHaveClass("fixed", "inset-0", "bg-cover", "bg-center");
		const languageSelect = screen.getByLabelText("Language");
		expect(languageSelect).toHaveClass("h-10");
		expect(languageSelect).not.toHaveClass("hidden");
		expect(
			document.querySelector("main.app-route-transition"),
		).toBeInTheDocument();
		expect(
			document.querySelector("header.app-route-transition"),
		).not.toBeInTheDocument();
	});

	it("renders the init form on the standalone init route", async () => {
		useInitStatusStore.setState({
			checking: false,
			initialized: false,
			error: null,
		});

		render(
			<MemoryRouter initialEntries={["/init"]}>
				<InitPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Finish initial setup",
			}),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Public site URL")).toBeInTheDocument();
	});

	it("renders the register form on the register route", async () => {
		authServiceMock.check.mockResolvedValue({ initialized: true });

		render(
			<MemoryRouter initialEntries={["/register"]}>
				<LoginPage />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Create account",
			}),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute(
			"href",
			"/login",
		);
	});

	it("shows setup required state before initialization", async () => {
		authServiceMock.check.mockResolvedValue({ initialized: false });
		const router = createMemoryRouter(
			[
				{
					element: <RequireInitialized />,
					children: [
						{
							path: "/register",
							element: <div>register-route</div>,
						},
					],
				},
				{ path: "/init", element: <div>init-route</div> },
			],
			{ initialEntries: ["/register"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("Setup required")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Start setup" })).toHaveAttribute(
			"href",
			"/init",
		);
		expect(screen.queryByText("register-route")).not.toBeInTheDocument();
		expect(screen.queryByText("init-route")).not.toBeInTheDocument();
	});

	it("shows login required state for protected routes when unauthenticated", async () => {
		const router = createMemoryRouter(
			[
				{
					element: <ProtectedRoute />,
					children: [
						{
							path: "/account",
							element: <Outlet />,
						},
					],
				},
				{ path: "/login", element: <div>login-route</div> },
			],
			{ initialEntries: ["/account"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("Login required")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute(
			"href",
			"/login",
		);
		expect(screen.queryByText("login-route")).not.toBeInTheDocument();
	});

	it("shows already signed in state on guest-only routes", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "user",
			status: "active",
		} as const;
		authServiceMock.me.mockResolvedValue(user);
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: false,
		});

		const router = createMemoryRouter(
			[
				{
					path: "/login",
					element: <LoginGuard />,
					children: [{ index: true, element: <div>login-route</div> }],
				},
				{
					path: "/register",
					element: <LoginGuard />,
					children: [{ index: true, element: <div>register-route</div> }],
				},
				{ path: "/account", element: <div>account-route</div> },
			],
			{ initialEntries: ["/register"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("Already signed in")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Open workbench" }),
		).toHaveAttribute("href", "/account");
		expect(screen.queryByText("account-route")).not.toBeInTheDocument();
		expect(screen.queryByText("login-route")).not.toBeInTheDocument();
		expect(screen.queryByText("register-route")).not.toBeInTheDocument();
	});

	it("does not block the login route with an auth check for anonymous visitors", async () => {
		useAuthStore.setState({
			user: null,
			checking: true,
			error: null,
			expiresAt: null,
			isAuthStale: false,
			isAuthenticated: false,
			isAdmin: false,
		});

		const router = createMemoryRouter(
			[
				{
					path: "/login",
					element: <LoginGuard />,
					children: [{ index: true, element: <div>login-route</div> }],
				},
			],
			{ initialEntries: ["/login"] },
		);

		authServiceMock.me.mockClear();
		render(<RouterProvider router={router} />);

		expect(await screen.findByText("login-route")).toBeInTheDocument();
		expect(authServiceMock.me).not.toHaveBeenCalled();
	});

	it("renders account and admin sections in the shared app sidebar", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/admin/settings",
							element: <div>admin-settings-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/admin/settings"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("admin-settings-route")).toBeInTheDocument();
		const sidebarNav = document.querySelector(
			'[data-slot="shell-desktop-sidebar"] nav',
		);
		expect(sidebarNav).toBeTruthy();
		const sidebarLinks = within(sidebarNav as HTMLElement).getAllByRole("link");
		expect(sidebarLinks.map((link) => link.getAttribute("href"))).toEqual([
			"/account",
			"/account/profiles",
			"/account/wardrobe",
			"/account/audit",
			"/account/settings",
			"/admin/users",
			"/admin/external-auth",
			"/admin/audit",
			"/admin/tasks",
			"/admin/settings",
			"/admin/about",
		]);
		for (const link of sidebarLinks) {
			expect(link.className).not.toContain("translate-y");
		}
		expect(
			within(sidebarNav as HTMLElement).getByText("My space"),
		).toBeVisible();
		expect(
			within(sidebarNav as HTMLElement).getByText("Administration"),
		).toBeVisible();
	});

	it("hides the account mobile topbar brand and removes the desktop search box", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/account",
							element: <div>account-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/account"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("account-route")).toBeInTheDocument();
		const topbar = screen.getByRole("banner");
		expect(
			within(topbar).queryByRole("link", { name: /AsterYggdrasil/ }),
		).not.toBeInTheDocument();
		expect(
			within(topbar).queryByPlaceholderText(
				"Search players, UUIDs, sessions, or settings...",
			),
		).not.toBeInTheDocument();
		expect(within(topbar).queryByText("⌘K")).not.toBeInTheDocument();
	});

	it("keeps the admin mobile topbar brand while removing the desktop search box", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/admin/settings",
							element: <div>admin-settings-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/admin/settings"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("admin-settings-route")).toBeInTheDocument();
		const topbar = screen.getByRole("banner");
		const brandLink = within(topbar).getByRole("link", {
			name: /AsterYggdrasil/,
		});
		expect(brandLink).toHaveAttribute("href", "/");
		expect(brandLink.querySelector("img")).toHaveClass("size-9");
		expect(
			within(topbar).queryByPlaceholderText(
				"Search players, UUIDs, sessions, or settings...",
			),
		).not.toBeInTheDocument();
		expect(within(topbar).queryByText("⌘K")).not.toBeInTheDocument();
	});

	it("opens the shared app navigation from the mobile topbar", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/account",
							element: <div>account-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/account"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("account-route")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

		const drawer = document.querySelector('[data-slot="shell-mobile-drawer"]');
		expect(drawer).toBeTruthy();
		expect(drawer).toHaveClass("translate-x-0", "shadow-2xl");
		expect(within(drawer as HTMLElement).getByText("My space")).toBeVisible();
		expect(
			within(drawer as HTMLElement).getByText("Administration"),
		).toBeVisible();
		expect(
			within(drawer as HTMLElement).getByRole("link", { name: "Users" }),
		).toHaveAttribute("href", "/admin/users");

		fireEvent.click(
			within(drawer as HTMLElement).getByRole("button", { name: "Close" }),
		);

		expect(drawer).toHaveClass("-translate-x-[calc(100%+1rem)]", "shadow-none");
	});

	it("shows home and personal settings actions in the admin user menu", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/admin/settings",
							element: <div>admin-settings-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/admin/settings"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("admin-settings-route")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "alex" }));

		const menu = document.querySelector('[data-slot="dropdown-menu-content"]');
		expect(menu).toBeTruthy();
		expect(
			within(menu as HTMLElement).getByRole("menuitem", {
				name: "Back to home",
			}),
		).toHaveAttribute("href", "/");
		expect(
			within(menu as HTMLElement).getByRole("menuitem", {
				name: "Personal settings",
			}),
		).toHaveAttribute("href", "/account/settings");
		expect(
			within(menu as HTMLElement).queryByRole("menuitem", {
				name: "Admin",
			}),
		).not.toBeInTheDocument();
		expect(
			within(menu as HTMLElement).queryByRole("separator"),
		).not.toBeInTheDocument();
	});

	it("shows a home action in the account user menu", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "admin",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: true,
		});

		const router = createMemoryRouter(
			[
				{
					element: <AppLayout />,
					children: [
						{
							path: "/account",
							element: <div>account-route</div>,
						},
					],
				},
			],
			{ initialEntries: ["/account"] },
		);

		render(<RouterProvider router={router} />);

		expect(await screen.findByText("account-route")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "alex" }));

		const menu = document.querySelector('[data-slot="dropdown-menu-content"]');
		expect(menu).toBeTruthy();
		expect(
			within(menu as HTMLElement).getByRole("menuitem", {
				name: "Back to home",
			}),
		).toHaveAttribute("href", "/");
		expect(
			within(menu as HTMLElement).queryByRole("menuitem", {
				name: "Personal settings",
			}),
		).not.toBeInTheDocument();
	});

	it("renders the personal settings page with account details and session entry", () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "user",
			status: "active",
		} as const;
		useAuthStore.setState({
			user,
			checking: false,
			error: null,
			expiresAt: Date.now() + 60_000,
			isAuthStale: false,
			isAuthenticated: true,
			isAdmin: false,
		});

		render(
			<MemoryRouter>
				<AccountSettingsPage />
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Personal settings",
			}),
		).toBeInTheDocument();
		expect(screen.getAllByText("alex").length).toBeGreaterThan(0);
		expect(screen.getAllByText("alex@example.com").length).toBeGreaterThan(0);
		expect(
			screen.getByRole("heading", { name: "Login devices" }),
		).toBeInTheDocument();
	});

	it("shows only active login devices in the settings section", async () => {
		const now = Date.now();
		const sessions: AuthSessionInfo[] = [
			{
				created_at: new Date(now - 60_000).toISOString(),
				id: "session-active",
				ip_address: "127.0.0.1",
				is_current: true,
				last_seen_at: new Date(now - 30_000).toISOString(),
				refresh_expires_at: new Date(now + 86_400_000).toISOString(),
				revoked: false,
				user_agent: "ActiveBrowser/1.0",
			},
			{
				created_at: new Date(now - 120_000).toISOString(),
				id: "session-revoked",
				ip_address: "127.0.0.2",
				is_current: false,
				last_seen_at: new Date(now - 90_000).toISOString(),
				refresh_expires_at: new Date(now + 86_400_000).toISOString(),
				revoked: true,
				user_agent: "RevokedBrowser/1.0",
			},
			{
				created_at: new Date(now - 180_000).toISOString(),
				id: "session-expired",
				ip_address: "127.0.0.3",
				is_current: false,
				last_seen_at: new Date(now - 150_000).toISOString(),
				refresh_expires_at: new Date(now - 1_000).toISOString(),
				revoked: false,
				user_agent: "ExpiredBrowser/1.0",
			},
		];
		authServiceMock.sessionsPage.mockResolvedValue(sessionsPage(sessions));

		render(
			<MemoryRouter>
				<LoginDevicesSection />
			</MemoryRouter>,
		);

		expect(await screen.findByText("ActiveBrowser/1.0")).toBeInTheDocument();
		expect(screen.queryByText("RevokedBrowser/1.0")).not.toBeInTheDocument();
		expect(screen.queryByText("ExpiredBrowser/1.0")).not.toBeInTheDocument();
		expect(
			screen.queryByText("sessions.status.revoked"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("sessions.status.expired"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("sessions.revokedSessionTitle"),
		).not.toBeInTheDocument();
	});
});

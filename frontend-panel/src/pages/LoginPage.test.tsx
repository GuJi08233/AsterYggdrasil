import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import type { AuthUserInfo } from "@/types/api";
import LoginPage from "./LoginPage";

const authServiceMock = vi.hoisted(() => ({
	check: vi.fn(),
	finishPasskeyLogin: vi.fn(),
	login: vi.fn(),
	me: vi.fn(),
	register: vi.fn(),
	setup: vi.fn(),
	startPasskeyLogin: vi.fn(),
}));

const externalAuthServiceMock = vi.hoisted(() => ({
	listPublic: vi.fn(),
	startAuthAlias: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("@/services/externalAuthService", () => ({
	externalAuthService: externalAuthServiceMock,
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

const user: AuthUserInfo = {
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
};

function renderLoginPage(initialEntry = "/login") {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<LoginPage />
		</MemoryRouter>,
	);
}

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.getState().clear();
		useFrontendConfigStore.getState().invalidate();
		authServiceMock.check.mockResolvedValue({ initialized: true });
		authServiceMock.login.mockResolvedValue({ expires_in: 3600 });
		authServiceMock.register.mockResolvedValue({ expires_in: 3600 });
		authServiceMock.setup.mockResolvedValue({ expires_in: 3600 });
		authServiceMock.finishPasskeyLogin.mockResolvedValue({ expires_in: 3600 });
		authServiceMock.me.mockResolvedValue(user);
		externalAuthServiceMock.listPublic.mockResolvedValue([]);
		externalAuthServiceMock.startAuthAlias.mockResolvedValue({
			authorization_url: "https://example.com/oauth",
		});
	});

	it("shows a welcome toast after password login succeeds", async () => {
		renderLoginPage();

		fireEvent.change(await screen.findByLabelText("login.identifier"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "nav.login" }));

		await waitFor(() =>
			expect(authServiceMock.login).toHaveBeenCalledWith({
				identifier: "alex",
				password: "secret-password",
			}),
		);
		expect(toastMock.success).toHaveBeenCalledWith("login.loginSuccess");
	});

	it("shows a success toast after registration succeeds", async () => {
		renderLoginPage("/register");

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.email"), {
			target: { value: "alex@example.com" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		fireEvent.click(screen.getByLabelText("login.acceptTerms"));
		fireEvent.click(screen.getByRole("button", { name: "login.registerNow" }));

		await waitFor(() =>
			expect(authServiceMock.register).toHaveBeenCalledWith({
				username: "alex",
				email: "alex@example.com",
				password: "secret-password",
			}),
		);
		expect(toastMock.success).toHaveBeenCalledWith("login.registerSuccess");
	});

	it("updates password strength color on the register form", async () => {
		renderLoginPage("/register");

		const passwordInput = await screen.findByLabelText("login.password");

		fireEvent.change(passwordInput, { target: { value: "short" } });
		expect(screen.getByText("login.passwordStrengthWeak")).toHaveClass(
			"text-red-700",
		);

		fireEvent.change(passwordInput, { target: { value: "longpassword12" } });
		expect(screen.getByText("login.passwordStrengthMedium")).toHaveClass(
			"text-amber-700",
		);

		fireEvent.change(passwordInput, {
			target: { value: "LongPassword12!" },
		});
		expect(screen.getByText("login.passwordStrengthStrong")).toHaveClass(
			"text-emerald-700",
		);
	});
});

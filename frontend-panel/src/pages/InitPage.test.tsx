import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import { useInitStatusStore } from "@/stores/initStatusStore";
import type { AuthUserInfo } from "@/types/api";
import InitPage from "./InitPage";

const authServiceMock = vi.hoisted(() => ({
	check: vi.fn(),
	me: vi.fn(),
	setup: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

const adminUser: AuthUserInfo = {
	id: 1,
	username: "admin",
	email: "admin@example.com",
	role: "admin",
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

function renderInitPage() {
	return render(
		<MemoryRouter initialEntries={["/init"]}>
			<InitPage />
		</MemoryRouter>,
	);
}

describe("InitPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.getState().clear();
		useFrontendConfigStore.getState().invalidate();
		useInitStatusStore.getState().reset();
		useInitStatusStore.setState({
			checking: false,
			initialized: false,
			error: null,
		});
		authServiceMock.setup.mockResolvedValue({ expires_in: 3600 });
		authServiceMock.me.mockResolvedValue(adminUser);
	});

	it("prefills the public site URL from the current origin", () => {
		renderInitPage();

		expect(screen.getByLabelText("init.publicSiteUrl")).toHaveValue(
			window.location.origin,
		);
	});

	it("rejects a public site URL with a path before setup", async () => {
		renderInitPage();

		fireEvent.change(screen.getByLabelText("login.username"), {
			target: { value: "admin" },
		});
		fireEvent.change(screen.getByLabelText("login.email"), {
			target: { value: "admin@example.com" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("init.publicSiteUrl"), {
			target: { value: "https://skin.example.com/app" },
		});

		expect(
			await screen.findByText("init.publicSiteUrlOriginOnly"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "init.createAdmin" }),
		).toBeDisabled();
		expect(authServiceMock.setup).not.toHaveBeenCalled();
	});

	it("creates the first admin with a normalized public site URL", async () => {
		renderInitPage();

		fireEvent.change(screen.getByLabelText("login.username"), {
			target: { value: "admin" },
		});
		fireEvent.change(screen.getByLabelText("login.email"), {
			target: { value: "admin@example.com" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("init.publicSiteUrl"), {
			target: { value: "https://Skin.EXAMPLE.com/" },
		});
		fireEvent.click(screen.getByRole("button", { name: "init.createAdmin" }));

		await waitFor(() =>
			expect(authServiceMock.setup).toHaveBeenCalledWith({
				username: "admin",
				email: "admin@example.com",
				password: "secret-password",
				public_site_url: "https://skin.example.com",
			}),
		);
		expect(toastMock.success).toHaveBeenCalledWith("init.setupComplete");
	});
});

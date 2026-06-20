import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/http";
import type { PublicUserInvitationInfo } from "@/types/api";
import InvitePage from "./InvitePage";

const authServiceMock = vi.hoisted(() => ({
	acceptInvitation: vi.fn(),
	verifyInvitation: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const translationMock = vi.hoisted(() => ({
	i18n: {
		changeLanguage: vi.fn(),
		language: "en-US",
	},
	t: (key: string) => key,
}));

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

vi.mock("react-i18next", () => ({
	initReactI18next: {
		init: vi.fn(),
		type: "3rdParty",
	},
	useTranslation: () => translationMock,
}));

const invitation: PublicUserInvitationInfo = {
	email: "alex@example.com",
	expires_at: "2026-07-01T12:00:00Z",
};

function renderInvitePage(initialEntry = "/invite/test-token") {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/invite/:token" element={<InvitePage />} />
				<Route path="/login" element={<div>login route</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("InvitePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authServiceMock.verifyInvitation.mockResolvedValue(invitation);
		authServiceMock.acceptInvitation.mockResolvedValue({
			id: 7,
			username: "alex",
			email: "alex@example.com",
			role: "user",
			status: "active",
		});
	});

	it("accepts an invitation with zod-normalized form values", async () => {
		renderInvitePage();

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "  alex-1  " },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "invite.accept" }));

		await waitFor(() =>
			expect(authServiceMock.acceptInvitation).toHaveBeenCalledWith(
				"test-token",
				{
					username: "alex-1",
					password: "secret-password",
				},
			),
		);
		expect(toastMock.success).toHaveBeenCalledWith("invite.accepted");
	});

	it("shows the shared auth footer and password visibility control", async () => {
		renderInvitePage();

		expect(await screen.findByText("invite.cardTitle")).toBeInTheDocument();
		expect(screen.getByText("login.protocolFooter")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "login.showPassword" }),
		).toBeInTheDocument();
	});

	it("validates invitation fields while typing", async () => {
		renderInvitePage();

		const usernameInput = await screen.findByLabelText("login.username");
		const passwordInput = screen.getByLabelText("login.password");
		const confirmPasswordInput = screen.getByLabelText("login.confirmPassword");

		fireEvent.change(usernameInput, { target: { value: "abc" } });
		expect(
			screen.getByText("login.validationUsernameLength"),
		).toBeInTheDocument();
		fireEvent.change(usernameInput, { target: { value: "alex-1" } });
		expect(
			screen.queryByText("login.validationUsernameLength"),
		).not.toBeInTheDocument();

		fireEvent.change(usernameInput, { target: { value: "bad name" } });
		expect(
			screen.getByText("login.validationUsernameChars"),
		).toBeInTheDocument();
		fireEvent.change(usernameInput, { target: { value: "alex_1" } });
		expect(
			screen.queryByText("login.validationUsernameChars"),
		).not.toBeInTheDocument();

		fireEvent.change(passwordInput, { target: { value: "short" } });
		expect(
			screen.getByText("login.validationPasswordLength"),
		).toBeInTheDocument();
		fireEvent.change(passwordInput, { target: { value: "secret-password" } });
		expect(
			screen.queryByText("login.validationPasswordLength"),
		).not.toBeInTheDocument();

		fireEvent.change(confirmPasswordInput, { target: { value: "different" } });
		expect(screen.getByText("login.passwordMismatch")).toBeInTheDocument();
		fireEvent.change(confirmPasswordInput, {
			target: { value: "secret-password" },
		});
		expect(
			screen.queryByText("login.passwordMismatch"),
		).not.toBeInTheDocument();
	});

	it("disables invitation submit until fields are valid", async () => {
		renderInvitePage();

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "abc" },
		});

		const submitButton = await screen.findByRole("button", {
			name: "invite.accept",
		});
		expect(submitButton).toBeDisabled();
		expect(authServiceMock.acceptInvitation).not.toHaveBeenCalled();
		expect(
			screen.getByText("login.validationUsernameLength"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("login.username"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		expect(submitButton).not.toBeDisabled();
	});

	it("validates invitation password confirmation with zod", async () => {
		renderInvitePage();

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "different" },
		});
		expect(authServiceMock.acceptInvitation).not.toHaveBeenCalled();
		expect(screen.getByText("login.passwordMismatch")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "invite.accept" }),
		).toBeDisabled();
	});

	it("validates invitation password length boundaries", async () => {
		renderInvitePage();

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "a".repeat(129) },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "a".repeat(129) },
		});
		expect(
			screen.getByText("login.validationPasswordLength"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "invite.accept" }),
		).toBeDisabled();

		const maxPassword = "a".repeat(128);
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: maxPassword },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: maxPassword },
		});
		expect(
			screen.queryByText("login.validationPasswordLength"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "invite.accept" }),
		).not.toBeDisabled();
	});

	it("shows an error panel when the invitation token is blank", async () => {
		renderInvitePage("/invite/%20");

		expect(await screen.findByText("invite.invalid")).toBeInTheDocument();
		expect(authServiceMock.verifyInvitation).not.toHaveBeenCalled();
	});

	it("shows an error panel when invitation verification fails", async () => {
		authServiceMock.verifyInvitation.mockRejectedValueOnce(
			new ApiError("not_found", "invitation not found"),
		);

		renderInvitePage();

		expect(await screen.findByText("invitation not found")).toBeInTheDocument();
		expect(authServiceMock.acceptInvitation).not.toHaveBeenCalled();
	});

	it("keeps the form open when accepting the invitation fails", async () => {
		authServiceMock.acceptInvitation.mockRejectedValueOnce(
			new ApiError("conflict", "username already exists"),
		);
		renderInvitePage();

		fireEvent.change(await screen.findByLabelText("login.username"), {
			target: { value: "alex" },
		});
		fireEvent.change(screen.getByLabelText("login.password"), {
			target: { value: "secret-password" },
		});
		fireEvent.change(screen.getByLabelText("login.confirmPassword"), {
			target: { value: "secret-password" },
		});
		fireEvent.click(screen.getByRole("button", { name: "invite.accept" }));

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith("username already exists"),
		);
		expect(screen.queryByText("login route")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "invite.accept" }),
		).not.toBeDisabled();
	});
});

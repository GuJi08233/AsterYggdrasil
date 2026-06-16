import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import type { PasskeyInfo, PasskeyPage } from "@/types/api";
import { SecurityPasskeysSection } from "./SecurityPasskeysSection";

const authServiceMock = vi.hoisted(() => ({
	deletePasskey: vi.fn(),
	finishPasskeyRegistration: vi.fn(),
	listPasskeysPage: vi.fn(),
	renamePasskey: vi.fn(),
	startPasskeyRegistration: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const webAuthnMock = vi.hoisted(() => {
	class WebAuthnUnsupportedError extends Error {
		constructor() {
			super("WebAuthn is not supported by this browser");
			this.name = "WebAuthnUnsupportedError";
		}
	}

	class WebAuthnCancelledError extends Error {
		constructor(message = "WebAuthn ceremony was cancelled") {
			super(message);
			this.name = "WebAuthnCancelledError";
		}
	}

	return {
		createPasskeyCredential: vi.fn(),
		isWebAuthnSupported: vi.fn(),
		WebAuthnCancelledError,
		WebAuthnUnsupportedError,
	};
});

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("@/lib/webauthn", () => webAuthnMock);

vi.mock("sonner", () => ({
	toast: toastMock,
}));

function passkey(overrides: Partial<PasskeyInfo> = {}): PasskeyInfo {
	return {
		backed_up: false,
		backup_eligible: false,
		created_at: "2026-06-15T00:00:00Z",
		id: 1,
		last_used_at: null,
		name: "MacBook Touch ID",
		sign_count: 0,
		transports: null,
		updated_at: "2026-06-15T00:00:00Z",
		...overrides,
	};
}

function passkeyPage(items: PasskeyInfo[], total = items.length): PasskeyPage {
	return { items, total };
}

function renderSection() {
	return render(<SecurityPasskeysSection />);
}

describe("SecurityPasskeysSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		webAuthnMock.isWebAuthnSupported.mockReturnValue(true);
		webAuthnMock.createPasskeyCredential.mockResolvedValue({
			id: "credential-1",
		});
		authServiceMock.listPasskeysPage.mockResolvedValue(passkeyPage([]));
		authServiceMock.startPasskeyRegistration.mockResolvedValue({
			flow_id: "flow-1",
			public_key: { publicKey: { challenge: "challenge" } },
		});
		authServiceMock.finishPasskeyRegistration.mockImplementation(
			(
				_flowId: string,
				_credential: unknown,
				name: string | null | undefined,
			) =>
				Promise.resolve(
					passkey({
						id: 7,
						name: name || "Default passkey",
					}),
				),
		);
		authServiceMock.renamePasskey.mockImplementation(
			(id: number, payload: { name: string }) =>
				Promise.resolve(passkey({ id, name: payload.name })),
		);
		authServiceMock.deletePasskey.mockResolvedValue(undefined);
	});

	it("uses the same outer settings panel style as the other account settings blocks", async () => {
		renderSection();

		const panel = screen.getByRole("heading", { name: "Passkeys" })
			.parentElement?.parentElement?.parentElement;

		expect(panel).toHaveClass(
			"rounded-lg",
			"border",
			"border-border/70",
			"bg-background/55",
			"p-4",
			"dark:border-white/10",
			"dark:bg-input/10",
		);
		expect(screen.getByRole("heading", { name: "Passkeys" }).tagName).toBe(
			"H3",
		);
		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
	});

	it("loads passkeys and renders metadata with the never-used fallback", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValue(
			passkeyPage([
				passkey({
					id: 11,
					name: "Desktop security key",
					created_at: "2026-06-01T00:00:00Z",
					updated_at: "2026-06-02T00:00:00Z",
				}),
			]),
		);

		renderSection();

		expect(await screen.findByText("Desktop security key")).toBeInTheDocument();
		expect(screen.getByText("Last used: Never used")).toBeInTheDocument();
		expect(
			screen.getByText("Created: 2026-06-01T00:00:00Z"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Updated: 2026-06-02T00:00:00Z"),
		).toBeInTheDocument();
		expect(authServiceMock.listPasskeysPage).toHaveBeenCalledWith({
			limit: 20,
			offset: 0,
		});
	});

	it("shows loading state until the passkey list request settles", async () => {
		let resolvePage: (page: PasskeyPage) => void = () => {};
		authServiceMock.listPasskeysPage.mockReturnValue(
			new Promise<PasskeyPage>((resolve) => {
				resolvePage = resolve;
			}),
		);

		renderSection();

		expect(screen.getByText("Loading")).toBeInTheDocument();
		resolvePage(passkeyPage([]));
		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
	});

	it("refreshes the current page and reports list failures without dropping the controls", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValueOnce(passkeyPage([]));
		authServiceMock.listPasskeysPage.mockRejectedValueOnce(new Error("boom"));

		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

		await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("boom"));
		expect(screen.getByRole("button", { name: "Add passkey" })).toBeEnabled();
		expect(authServiceMock.listPasskeysPage).toHaveBeenLastCalledWith({
			limit: 20,
			offset: 0,
		});
	});

	it("creates a passkey, trims the optional name, resets to the first page, and reloads", async () => {
		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.change(screen.getByPlaceholderText("Device name"), {
			target: { value: "  Office YubiKey  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

		await waitFor(() =>
			expect(authServiceMock.startPasskeyRegistration).toHaveBeenCalledWith({
				name: "Office YubiKey",
			}),
		);
		expect(webAuthnMock.createPasskeyCredential).toHaveBeenCalledWith({
			publicKey: { challenge: "challenge" },
		});
		expect(authServiceMock.finishPasskeyRegistration).toHaveBeenCalledWith(
			"flow-1",
			{ id: "credential-1" },
			"Office YubiKey",
		);
		expect(toastMock.success).toHaveBeenCalledWith("Passkey added");
		await waitFor(() =>
			expect(authServiceMock.listPasskeysPage).toHaveBeenLastCalledWith({
				limit: 20,
				offset: 0,
			}),
		);
		expect(screen.getByPlaceholderText("Device name")).toHaveValue("");
	});

	it("sends null for blank passkey names", async () => {
		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.change(screen.getByPlaceholderText("Device name"), {
			target: { value: "   " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

		await waitFor(() =>
			expect(authServiceMock.startPasskeyRegistration).toHaveBeenCalledWith({
				name: null,
			}),
		);
		expect(authServiceMock.finishPasskeyRegistration).toHaveBeenCalledWith(
			"flow-1",
			{ id: "credential-1" },
			null,
		);
	});

	it("disables creation and shows the unsupported hint when WebAuthn is unavailable", async () => {
		webAuthnMock.isWebAuthnSupported.mockReturnValue(false);

		renderSection();

		expect(
			await screen.findByText("This browser does not support passkeys."),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Add passkey" })).toBeDisabled();
		expect(authServiceMock.startPasskeyRegistration).not.toHaveBeenCalled();
	});

	it("does not finish registration when the browser cancels WebAuthn", async () => {
		webAuthnMock.createPasskeyCredential.mockRejectedValue(
			new webAuthnMock.WebAuthnCancelledError(),
		);

		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith(
				"Passkey operation canceled",
			),
		);
		expect(authServiceMock.startPasskeyRegistration).toHaveBeenCalled();
		expect(authServiceMock.finishPasskeyRegistration).not.toHaveBeenCalled();
	});

	it("reports a late unsupported WebAuthn error during creation", async () => {
		webAuthnMock.createPasskeyCredential.mockRejectedValue(
			new webAuthnMock.WebAuthnUnsupportedError(),
		);

		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith(
				"This browser does not support passkeys.",
			),
		);
		expect(authServiceMock.finishPasskeyRegistration).not.toHaveBeenCalled();
	});

	it("reports start registration failures and re-enables the add button", async () => {
		authServiceMock.startPasskeyRegistration.mockRejectedValue(
			new Error("registration unavailable"),
		);

		renderSection();

		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith("registration unavailable"),
		);
		expect(webAuthnMock.createPasskeyCredential).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Add passkey" })).toBeEnabled();
	});

	it("renames a passkey with a non-empty name and exits edit mode", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValue(
			passkeyPage([passkey({ id: 4, name: "Old key" })]),
		);

		renderSection();

		expect(await screen.findByText("Old key")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Rename" }));

		const nameInput = screen.getByDisplayValue("Old key");
		fireEvent.change(nameInput, { target: { value: "New key" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(authServiceMock.renamePasskey).toHaveBeenCalledWith(4, {
				name: "New key",
			}),
		);
		expect(toastMock.success).toHaveBeenCalledWith("Passkey renamed");
		expect(await screen.findByText("New key")).toBeInTheDocument();
		expect(screen.queryByDisplayValue("New key")).not.toBeInTheDocument();
	});

	it("blocks saving an empty rename and can cancel edit mode without calling the API", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValue(
			passkeyPage([passkey({ id: 5, name: "Hardware key" })]),
		);

		renderSection();

		expect(await screen.findByText("Hardware key")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Rename" }));
		fireEvent.change(screen.getByDisplayValue("Hardware key"), {
			target: { value: "   " },
		});

		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(authServiceMock.renamePasskey).not.toHaveBeenCalled();
		expect(screen.getByText("Hardware key")).toBeInTheDocument();
	});

	it("reports rename failures and keeps edit mode available for retry", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValue(
			passkeyPage([passkey({ id: 6, name: "Retry key" })]),
		);
		authServiceMock.renamePasskey.mockRejectedValue(new Error("rename failed"));

		renderSection();

		expect(await screen.findByText("Retry key")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Rename" }));
		fireEvent.change(screen.getByDisplayValue("Retry key"), {
			target: { value: "Still retry key" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith("rename failed"),
		);
		expect(screen.getByDisplayValue("Still retry key")).toBeInTheDocument();
	});

	it("deletes a passkey, reloads the list, and shows the empty state", async () => {
		authServiceMock.listPasskeysPage
			.mockResolvedValueOnce(
				passkeyPage([passkey({ id: 8, name: "Delete me" })]),
			)
			.mockResolvedValueOnce(passkeyPage([]));

		renderSection();

		const row = (await screen.findByText("Delete me")).closest("div");
		expect(row).not.toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() =>
			expect(authServiceMock.deletePasskey).toHaveBeenCalledWith(8),
		);
		expect(toastMock.success).toHaveBeenCalledWith("Passkey deleted");
		expect(await screen.findByText("No passkeys yet.")).toBeInTheDocument();
	});

	it("reports delete failures without removing the passkey row", async () => {
		authServiceMock.listPasskeysPage.mockResolvedValue(
			passkeyPage([passkey({ id: 9, name: "Keep me" })]),
		);
		authServiceMock.deletePasskey.mockRejectedValue(new Error("delete failed"));

		renderSection();

		const passkeyRow = (await screen.findByText("Keep me")).closest("div.grid");
		expect(passkeyRow).not.toBeNull();
		fireEvent.click(
			within(passkeyRow as HTMLElement).getByRole("button", {
				name: "Delete",
			}),
		);

		await waitFor(() =>
			expect(toastMock.error).toHaveBeenCalledWith("delete failed"),
		);
		expect(screen.getByText("Keep me")).toBeInTheDocument();
	});
});

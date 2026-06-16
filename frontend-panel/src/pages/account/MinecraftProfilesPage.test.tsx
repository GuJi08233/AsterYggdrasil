import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MinecraftProfilesPage from "@/pages/account/MinecraftProfilesPage";

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const yggdrasilServiceMock = vi.hoisted(() => ({
	createProfile: vi.fn(),
	deleteTexture: vi.fn(),
	listProfileTextures: vi.fn(),
	listProfiles: vi.fn(),
	renameProfile: vi.fn(),
	uploadTexture: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

vi.mock("@/services/yggdrasilService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/yggdrasilService")>();
	return {
		...actual,
		yggdrasilService: yggdrasilServiceMock,
	};
});

vi.mock("@/components/yggdrasil/MinecraftPreview", () => ({
	MinecraftPreview: ({ label }: { label: string }) => (
		<div data-testid="minecraft-preview">{label}</div>
	),
}));

vi.mock("@/components/yggdrasil/LauncherSetupCard", () => ({
	LauncherSetupCard: ({ profileName }: { profileName?: string | null }) => (
		<div data-testid="launcher-card">{profileName ?? ""}</div>
	),
}));

describe("MinecraftProfilesPage rename workflow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		yggdrasilServiceMock.listProfiles.mockResolvedValue([
			{ id: "profile-one", name: "OldName", properties: [] },
		]);
		yggdrasilServiceMock.listProfileTextures.mockResolvedValue([]);
		yggdrasilServiceMock.renameProfile.mockResolvedValue({
			id: "profile-one",
			name: "NewName",
			properties: [],
		});
	});

	it("renames a current-user profile and reloads the selected profile", async () => {
		render(<MinecraftProfilesPage />);

		await screen.findAllByText("OldName");
		fireEvent.click(
			screen.getByRole("button", { name: "profiles.renameAction" }),
		);

		const dialog = screen.getByRole("dialog");
		const input = within(dialog).getByLabelText("profiles.profileName");
		expect(input).toHaveValue("OldName");

		yggdrasilServiceMock.listProfiles.mockResolvedValueOnce([
			{ id: "profile-one", name: "NewName", properties: [] },
		]);
		fireEvent.change(input, { target: { value: " NewName " } });
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.save" }),
		);

		await waitFor(() => {
			expect(yggdrasilServiceMock.renameProfile).toHaveBeenCalledWith(
				"profile-one",
				{ name: "NewName" },
			);
		});
		await waitFor(() => {
			expect(toastMock.success).toHaveBeenCalledWith("profiles.renameSuccess");
		});
	});

	it("does not submit rename when the dialog is cancelled or the name is blank", async () => {
		render(<MinecraftProfilesPage />);

		await screen.findAllByText("OldName");
		fireEvent.click(
			screen.getByRole("button", { name: "profiles.renameAction" }),
		);

		let dialog = screen.getByRole("dialog");
		fireEvent.change(within(dialog).getByLabelText("profiles.profileName"), {
			target: { value: "   " },
		});
		expect(
			within(dialog).getByRole("button", { name: "common.save" }),
		).toBeDisabled();
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.cancel" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(yggdrasilServiceMock.renameProfile).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", { name: "profiles.renameAction" }),
		);
		dialog = screen.getByRole("dialog");
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.cancel" }),
		);

		expect(yggdrasilServiceMock.renameProfile).not.toHaveBeenCalled();
	});

	it("keeps the dialog open and shows the API error when rename fails", async () => {
		yggdrasilServiceMock.renameProfile.mockRejectedValueOnce(
			new Error("profile name already exists"),
		);
		render(<MinecraftProfilesPage />);

		await screen.findAllByText("OldName");
		fireEvent.click(
			screen.getByRole("button", { name: "profiles.renameAction" }),
		);
		const dialog = screen.getByRole("dialog");
		fireEvent.change(within(dialog).getByLabelText("profiles.profileName"), {
			target: { value: "TakenName" },
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.save" }),
		);

		await waitFor(() => {
			expect(toastMock.error).toHaveBeenCalledWith(
				"profile name already exists",
			);
		});
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});

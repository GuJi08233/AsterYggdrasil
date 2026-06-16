import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminMinecraftProfilePage from "@/pages/admin/AdminMinecraftProfilePage";

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const adminMinecraftProfileServiceMock = vi.hoisted(() => ({
	delete: vi.fn(),
	deleteTexture: vi.fn(),
	get: vi.fn(),
	listTextures: vi.fn(),
	rename: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

vi.mock("@/hooks/useApiError", () => ({
	handleApiError: (error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		toastMock.error(message);
	},
}));

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminMinecraftProfileService: adminMinecraftProfileServiceMock,
	};
});

vi.mock("@/components/yggdrasil/MinecraftPreview", () => ({
	MinecraftPreview: ({ label }: { label: string }) => (
		<div data-testid="minecraft-preview">{label}</div>
	),
}));

const baseProfile = {
	created_at: "2026-06-15T00:00:00Z",
	id: 7,
	name: "AdminOld",
	texture_model: "default" as const,
	updated_at: "2026-06-15T00:00:00Z",
	uploadable_textures: "skin,cape",
	user_id: 1,
	uuid: "profile-uuid",
};

function renderPage() {
	return render(
		<MemoryRouter initialEntries={["/admin/minecraft-profiles/profile-uuid"]}>
			<Routes>
				<Route
					path="/admin/minecraft-profiles/:uuid"
					element={<AdminMinecraftProfilePage />}
				/>
				<Route path="/admin/users" element={<div>users page</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("AdminMinecraftProfilePage rename workflow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		adminMinecraftProfileServiceMock.get.mockResolvedValue(baseProfile);
		adminMinecraftProfileServiceMock.listTextures.mockResolvedValue([]);
		adminMinecraftProfileServiceMock.rename.mockResolvedValue({
			...baseProfile,
			name: "AdminNew",
			updated_at: "2026-06-15T00:01:00Z",
		});
	});

	it("renames an admin profile and refreshes the page state", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "AdminOld" });
		fireEvent.click(
			screen.getByRole("button", {
				name: "admin.minecraftProfilePage.renameAction",
			}),
		);

		const dialog = screen.getByRole("dialog");
		const input = within(dialog).getByLabelText(
			"admin.minecraftProfilePage.profileName",
		);
		expect(input).toHaveValue("AdminOld");
		fireEvent.change(input, { target: { value: " AdminNew " } });
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.save" }),
		);

		await waitFor(() => {
			expect(adminMinecraftProfileServiceMock.rename).toHaveBeenCalledWith(
				"profile-uuid",
				{ name: "AdminNew" },
			);
		});
		expect(
			await screen.findByRole("heading", { name: "AdminNew" }),
		).toBeInTheDocument();
		expect(toastMock.success).toHaveBeenCalledWith(
			"admin.minecraftProfilePage.renameSuccess",
		);
	});

	it("does not submit admin rename when cancelled or blank", async () => {
		renderPage();

		await screen.findByRole("heading", { name: "AdminOld" });
		fireEvent.click(
			screen.getByRole("button", {
				name: "admin.minecraftProfilePage.renameAction",
			}),
		);

		let dialog = screen.getByRole("dialog");
		fireEvent.change(
			within(dialog).getByLabelText("admin.minecraftProfilePage.profileName"),
			{
				target: { value: "" },
			},
		);
		expect(
			within(dialog).getByRole("button", { name: "common.save" }),
		).toBeDisabled();
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.cancel" }),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(adminMinecraftProfileServiceMock.rename).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", {
				name: "admin.minecraftProfilePage.renameAction",
			}),
		);
		dialog = screen.getByRole("dialog");
		fireEvent.click(
			within(dialog).getByRole("button", { name: "common.cancel" }),
		);

		expect(adminMinecraftProfileServiceMock.rename).not.toHaveBeenCalled();
	});

	it("keeps admin rename dialog open and surfaces API errors", async () => {
		adminMinecraftProfileServiceMock.rename.mockRejectedValueOnce(
			new Error("profile name already exists"),
		);
		renderPage();

		await screen.findByRole("heading", { name: "AdminOld" });
		fireEvent.click(
			screen.getByRole("button", {
				name: "admin.minecraftProfilePage.renameAction",
			}),
		);
		const dialog = screen.getByRole("dialog");
		fireEvent.change(
			within(dialog).getByLabelText("admin.minecraftProfilePage.profileName"),
			{
				target: { value: "TakenName" },
			},
		);
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

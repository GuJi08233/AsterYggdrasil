import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicTextureDetailPage from "@/pages/PublicTextureDetailPage";
import { ApiError } from "@/services/http";
import { useAuthStore } from "@/stores/authStore";
import type {
	MinecraftWardrobeTextureMetadata,
	PublicTextureLibraryTextureMetadata,
} from "@/types/api";

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const yggdrasilServiceMock = vi.hoisted(() => ({
	copyPublicTextureToWardrobe: vi.fn(),
	createTextureReport: vi.fn(),
	getPublicTextureLibraryTexture: vi.fn(),
}));

const authServiceMock = vi.hoisted(() => ({
	me: vi.fn(),
}));

const tMock = vi.hoisted(
	() =>
		(
			key: string,
			values?: Record<string, string | number | null | undefined>,
		) => {
			const suffix =
				values && Object.keys(values).length > 0
					? ` ${JSON.stringify(values)}`
					: "";
			return `${key}${suffix}`;
		},
);

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: { language: "en-US" },
		t: tMock,
	}),
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

vi.mock("@/services/authService", () => ({
	authService: authServiceMock,
}));

vi.mock("@/services/yggdrasilService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/yggdrasilService")>();
	return {
		...actual,
		yggdrasilService: yggdrasilServiceMock,
	};
});

vi.mock("@/components/yggdrasil/MinecraftPreviewPanel", () => ({
	MinecraftPreviewPanel: ({
		capeUrl,
		label,
		model,
		playerName,
		skinUrl,
	}: {
		capeUrl?: string | null;
		label: string;
		model?: string;
		playerName?: string | null;
		skinUrl?: string | null;
	}) => (
		<div data-testid="minecraft-preview-panel">
			<span>{label}</span>
			<span>{playerName}</span>
			<span>{model}</span>
			<span>{skinUrl}</span>
			<span>{capeUrl}</span>
		</div>
	),
}));

function publicTexture(
	overrides: Partial<PublicTextureLibraryTextureMetadata> = {},
): PublicTextureLibraryTextureMetadata {
	return {
		created_at: "2026-06-15T00:00:00Z",
		display_name: "Shared Slim",
		file_size: 2048,
		hash: "shared-slim-texture-hash",
		height: 64,
		id: 21,
		library_status: "private",
		mime_type: "image/png",
		name: "Shared Slim",
		tags: [
			{
				color: "#228855",
				created_at: "2026-06-15T00:00:00Z",
				id: 3,
				name: "Featured",
				sort_order: 1,
				updated_at: "2026-06-15T00:00:00Z",
			},
		],
		texture_model: "slim",
		texture_type: "skin",
		updated_at: "2026-06-15T00:00:00Z",
		uploader: {
			avatar: {
				source: "gravatar",
				url_1024: "https://example.test/avatar-1024.webp",
				url_512: "https://example.test/avatar-512.webp",
				version: 0,
			},
			id: 1,
			name: "Texture Artist",
			public_uuid: "user-public-uuid",
			username: "artist",
		},
		url: "/textures/shared-slim.png",
		visibility: "public",
		width: 64,
		...overrides,
	};
}

function copiedTexture(
	overrides: Partial<MinecraftWardrobeTextureMetadata> = {},
): MinecraftWardrobeTextureMetadata {
	return {
		created_at: "2026-06-15T00:00:00Z",
		display_name: "Shared Slim",
		file_size: 2048,
		hash: "shared-slim-texture-hash",
		height: 64,
		id: 31,
		library_status: "private",
		mime_type: "image/png",
		name: "Shared Slim",
		tags: [],
		texture_model: "slim",
		texture_type: "skin",
		updated_at: "2026-06-15T00:00:00Z",
		url: "/textures/shared-slim.png",
		visibility: "private",
		width: 64,
		...overrides,
	};
}

async function renderPage(path = "/textures/21") {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/textures/:textureId"
					element={<PublicTextureDetailPage />}
				/>
			</Routes>
		</MemoryRouter>,
	);
	if (path === "/textures/21") {
		await screen.findByRole("heading", { name: "Shared Slim" });
	}
}

function topDialog() {
	const dialog = screen
		.getAllByRole("dialog", { hidden: true })
		.filter((element) => !element.hasAttribute("hidden"))
		.at(-1);
	expect(dialog).toBeDefined();
	return dialog as HTMLElement;
}

function copyConfirmButton(dialog: HTMLElement) {
	const button = within(dialog)
		.getByText("library.copyConfirmAction")
		.closest("button");
	expect(button).toBeInstanceOf(HTMLButtonElement);
	return button as HTMLButtonElement;
}

describe("PublicTextureDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.getState().clear();
		authServiceMock.me.mockRejectedValue(new Error("unauthenticated"));
		yggdrasilServiceMock.getPublicTextureLibraryTexture.mockResolvedValue(
			publicTexture(),
		);
		yggdrasilServiceMock.copyPublicTextureToWardrobe.mockResolvedValue(
			copiedTexture(),
		);
		yggdrasilServiceMock.createTextureReport.mockResolvedValue({
			id: 5,
			texture_id: 21,
			reason: "copyright",
			message: "copied",
			status: "pending",
			admin_note: null,
			texture: publicTexture(),
			reporter: { name: "alex", public_uuid: "user-public-uuid" },
			handler: null,
			handled_at: null,
			created_at: "2026-06-15T00:00:00Z",
			updated_at: "2026-06-15T00:00:00Z",
		});
	});

	it("loads public texture details with the 3D preview and metadata", async () => {
		await renderPage();

		expect(
			yggdrasilServiceMock.getPublicTextureLibraryTexture,
		).toHaveBeenCalledWith(21);
		expect(
			screen.getByRole("link", { name: "library.backToLibrary" }),
		).toHaveAttribute("href", "/textures");
		expect(screen.getByTestId("public-texture-detail-preview")).toHaveAttribute(
			"data-skin-url",
			"/textures/shared-slim.png",
		);
		expect(screen.getByTestId("public-texture-detail-preview")).toHaveAttribute(
			"data-model",
			"slim",
		);
		expect(screen.getAllByText("Texture Artist").length).toBeGreaterThan(0);
		expect(screen.getByText("Featured")).toBeInTheDocument();
		expect(
			document.querySelector('img[src="/textures/shared-slim.png"]'),
		).not.toBeInTheDocument();
	});

	it("copies with a custom wardrobe name", async () => {
		await renderPage();

		fireEvent.click(screen.getByRole("button", { name: "library.copyAction" }));
		const copyDialog = topDialog();
		fireEvent.change(
			within(copyDialog).getByLabelText("library.copyNameLabel"),
			{
				target: { value: "Custom Copy" },
			},
		);
		fireEvent.click(copyConfirmButton(copyDialog));

		await waitFor(() => {
			expect(
				yggdrasilServiceMock.copyPublicTextureToWardrobe,
			).toHaveBeenCalledWith(21, { display_name: "Custom Copy" });
		});
		expect(toastMock.success).toHaveBeenCalledWith(
			'library.copySuccess {"name":"Shared Slim"}',
		);
	});

	it("sends null when copy name is cleared", async () => {
		await renderPage();

		fireEvent.click(screen.getByRole("button", { name: "library.copyAction" }));
		const copyDialog = topDialog();
		fireEvent.change(
			within(copyDialog).getByLabelText("library.copyNameLabel"),
			{
				target: { value: "   " },
			},
		);
		fireEvent.click(copyConfirmButton(copyDialog));

		await waitFor(() => {
			expect(
				yggdrasilServiceMock.copyPublicTextureToWardrobe,
			).toHaveBeenCalledWith(21, { display_name: null });
		});
	});

	it("keeps the copy dialog open and shows inline duplicate-name errors", async () => {
		yggdrasilServiceMock.copyPublicTextureToWardrobe.mockRejectedValueOnce(
			new ApiError("wardrobe.texture_name_taken", "name taken"),
		);
		await renderPage();

		fireEvent.click(screen.getByRole("button", { name: "library.copyAction" }));
		const copyDialog = topDialog();
		fireEvent.click(copyConfirmButton(copyDialog));

		await within(copyDialog).findByText("library.copyNameTaken");
		expect(toastMock.error).not.toHaveBeenCalled();
		expect(
			within(copyDialog).getByLabelText("library.copyNameLabel"),
		).toHaveValue("Shared Slim");
	});

	it("requires sign-in before reporting a texture", async () => {
		await renderPage();

		fireEvent.click(
			screen.getByRole("button", { name: "library.reportAction" }),
		);

		expect(yggdrasilServiceMock.createTextureReport).not.toHaveBeenCalled();
		expect(
			screen.queryByText("library.reportDialogTitle"),
		).not.toBeInTheDocument();
	});

	it("submits a texture report for signed-in users", async () => {
		const user = {
			id: 7,
			username: "alex",
			email: "alex@example.com",
			email_verified: true,
			must_change_password: false,
			operator_scopes: [],
			pending_email: null,
			profile: {
				display_name: null,
				avatar: {
					source: "none",
					url_512: null,
					url_1024: null,
					version: 0,
				},
			},
			role: "user",
			status: "active",
		} as const;
		authServiceMock.me.mockResolvedValue(user);
		useAuthStore.setState({
			user,
			isAuthenticated: true,
		});
		await renderPage();

		fireEvent.click(
			screen.getByRole("button", { name: "library.reportAction" }),
		);
		const reportDialog = topDialog();
		fireEvent.change(
			within(reportDialog).getByLabelText("library.reportMessageLabel"),
			{
				target: { value: "  copied from another site  " },
			},
		);
		fireEvent.click(
			within(reportDialog)
				.getByText("library.reportSubmitAction")
				.closest("button") as HTMLButtonElement,
		);

		await waitFor(() => {
			expect(yggdrasilServiceMock.createTextureReport).toHaveBeenCalledWith(
				21,
				{
					message: "copied from another site",
					reason: "inappropriate",
				},
			);
		});
		expect(toastMock.success).toHaveBeenCalledWith("library.reportSuccess");
	});

	it("rejects invalid route params without calling the backend", async () => {
		await renderPage("/textures/not-a-number");

		expect(
			yggdrasilServiceMock.getPublicTextureLibraryTexture,
		).not.toHaveBeenCalled();
		expect(
			await screen.findByText("library.detailUnavailableTitle"),
		).toBeInTheDocument();
		expect(screen.getByText("library.detailNotFound")).toBeInTheDocument();
	});
});

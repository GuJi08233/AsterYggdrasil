import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTextureLibraryReportsPage from "@/pages/admin/AdminTextureLibraryReportsPage";
import type { AdminTextureReportPage, TextureReportInfo } from "@/types/api";

const toastMock = vi.hoisted(() => ({
	error: vi.fn(),
	success: vi.fn(),
}));

const adminTextureLibraryServiceMock = vi.hoisted(() => ({
	acceptReport: vi.fn(),
	listReports: vi.fn(),
	rejectReport: vi.fn(),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: { language: "en-US" },
		t: (
			key: string,
			values?: Record<string, string | number | null | undefined>,
		) => {
			const suffix =
				values && Object.keys(values).length > 0
					? ` ${JSON.stringify(values)}`
					: "";
			return `${key}${suffix}`;
		},
	}),
}));

vi.mock("sonner", () => ({
	toast: toastMock,
}));

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminTextureLibraryService: adminTextureLibraryServiceMock,
	};
});

vi.mock("@/hooks/useApiError", () => ({
	handleApiError: (error: unknown) => {
		toastMock.error(error instanceof Error ? error.message : String(error));
	},
}));

function reportPage(
	items: TextureReportInfo[] = [report()],
): AdminTextureReportPage {
	return {
		items,
		limit: 20,
		next_cursor: null,
		total: items.length,
	};
}

function report(overrides: Partial<TextureReportInfo> = {}): TextureReportInfo {
	return {
		admin_note: null,
		created_at: "2026-06-15T00:00:00Z",
		handled_at: null,
		handler: null,
		id: 7,
		message: "copied from another site",
		reason: "copyright",
		reporter: {
			name: "Alex",
			public_uuid: "reporter-public-uuid",
		},
		status: "pending",
		texture: {
			created_at: "2026-06-15T00:00:00Z",
			display_name: "Reported Skin",
			file_size: 128,
			hash: "hash-reported",
			height: 64,
			id: 12,
			library_review_note: null,
			library_reviewed_at: "2026-06-15T01:00:00Z",
			library_status: "published",
			library_submitted_at: "2026-06-15T00:30:00Z",
			mime_type: "image/png",
			name: "Reported Skin",
			preview_url: "/textures/reported-preview.png",
			tags: [],
			texture_model: "slim",
			texture_type: "skin",
			updated_at: "2026-06-15T00:00:00Z",
			uploader: {
				avatar: {
					source: "none",
					url_1024: null,
					url_512: null,
					version: 0,
				},
				id: 1,
				name: "Steve",
				public_uuid: "uploader-public-uuid",
				username: "steve",
			},
			url: "/textures/reported.png",
			visibility: "public",
			width: 64,
		},
		texture_id: 12,
		updated_at: "2026-06-15T00:00:00Z",
		...overrides,
	};
}

function renderPage() {
	render(
		<MemoryRouter>
			<AdminTextureLibraryReportsPage />
		</MemoryRouter>,
	);
}

function topDialog() {
	const dialog = screen
		.getAllByRole("dialog", { hidden: true })
		.filter((element) => !element.hasAttribute("hidden"))
		.at(-1);
	expect(dialog).toBeDefined();
	return dialog as HTMLElement;
}

describe("AdminTextureLibraryReportsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		adminTextureLibraryServiceMock.listReports.mockResolvedValue(reportPage());
		adminTextureLibraryServiceMock.acceptReport.mockResolvedValue(
			report({
				admin_note: "confirmed",
				handled_at: "2026-06-15T02:00:00Z",
				handler: { name: "Admin", public_uuid: "admin-public-uuid" },
				status: "accepted",
			}),
		);
		adminTextureLibraryServiceMock.rejectReport.mockResolvedValue(
			report({ status: "rejected" }),
		);
	});

	it("loads pending reports by default", async () => {
		renderPage();

		await screen.findByText("Reported Skin");

		expect(adminTextureLibraryServiceMock.listReports).toHaveBeenCalledWith({
			after_created_at: undefined,
			after_id: undefined,
			limit: 20,
			reason: undefined,
			status: "pending",
		});
		expect(
			screen.getByRole("link", {
				name: /admin.textureLibraryReportsPage.reports/,
			}),
		).toHaveAttribute("href", "/admin/texture-library/reports");
		expect(
			screen.getByText("admin.textureLibraryReportsPage.reason.copyright"),
		).toBeInTheDocument();
	});

	it("accepts a pending report and sends the handling note", async () => {
		renderPage();
		await screen.findByText("Reported Skin");

		fireEvent.click(
			screen.getByRole("button", {
				name: "admin.textureLibraryReportsPage.acceptAction",
			}),
		);
		const dialog = topDialog();
		fireEvent.change(
			within(dialog).getByLabelText(
				"admin.textureLibraryReportsPage.adminNote",
			),
			{
				target: { value: "  confirmed  " },
			},
		);
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "admin.textureLibraryReportsPage.acceptAction",
			}),
		);

		await waitFor(() => {
			expect(adminTextureLibraryServiceMock.acceptReport).toHaveBeenCalledWith(
				7,
				{
					admin_note: "confirmed",
				},
			);
		});
		expect(toastMock.success).toHaveBeenCalledWith(
			"admin.textureLibraryReportsPage.acceptSuccess",
		);
	});
});

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import AdminAboutPage from "@/pages/admin/AdminAboutPage";
import { adminSystemService } from "@/services/adminService";

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminSystemService: {
			getInfo: vi.fn(),
		},
	};
});

describe("AdminAboutPage", () => {
	beforeEach(() => {
		vi.mocked(adminSystemService.getInfo).mockReset();
	});

	it("renders authenticated build metadata from admin system info", async () => {
		vi.mocked(adminSystemService.getInfo).mockResolvedValue({
			version: "0.0.0-alpha.1",
			build_time: "2026-06-15T08:30:00.000Z",
		});

		render(<AdminAboutPage />);

		expect(await screen.findByText("v0.0.0-alpha.1")).toBeInTheDocument();
		expect(
			screen.queryByText("/api/v1/admin/system-info"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("/health")).not.toBeInTheDocument();
		expect(screen.queryByText("unknown")).not.toBeInTheDocument();
	});

	it("keeps the about page usable when system info fails to load", async () => {
		vi.mocked(adminSystemService.getInfo).mockRejectedValue(
			new Error("request denied"),
		);

		render(<AdminAboutPage />);

		expect(await screen.findByText("request denied")).toBeInTheDocument();
		expect(screen.queryByText("/health/ready")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(adminSystemService.getInfo).toHaveBeenCalledTimes(1);
		});
	});
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { i18next } from "@/i18n";
import type { AdminUserInfo } from "@/types/api";
import AdminUserDetailPage from "./AdminUserDetailPage";

const adminUserServiceMock = vi.hoisted(() => ({
	get: vi.fn(),
	listBans: vi.fn(),
	revokeSessions: vi.fn(),
	update: vi.fn(),
}));

const adminMinecraftProfileServiceMock = vi.hoisted(() => ({
	listByUserPage: vi.fn(),
}));

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminMinecraftProfileService: adminMinecraftProfileServiceMock,
		adminUserService: adminUserServiceMock,
	};
});

const user: AdminUserInfo = {
	active_session_count: 0,
	created_at: "2026-06-18T00:00:00.000Z",
	email: "esaps@esaps.net",
	email_verified_at: null,
	id: 1,
	must_change_password: false,
	pending_email: null,
	profile: {
		avatar: { source: "none", url_1024: null, url_512: null, version: 0 },
		display_name: "AptS:1547",
	},
	profile_count: 1,
	role: "admin",
	session_version: 1,
	status: "active",
	updated_at: "2026-06-18T00:00:00.000Z",
	username: "esap",
};

function renderPage() {
	return render(
		<MemoryRouter initialEntries={["/admin/users/1"]}>
			<Routes>
				<Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
				<Route path="/admin/users" element={<div>users page</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("AdminUserDetailPage", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await i18next.changeLanguage("zh-CN");
		adminUserServiceMock.get.mockResolvedValue(user);
		adminUserServiceMock.listBans.mockResolvedValue({
			items: [],
			limit: 50,
			next_cursor: null,
			offset: 0,
			total: 0,
		});
		adminUserServiceMock.revokeSessions.mockResolvedValue({ removed: 0 });
		adminUserServiceMock.update.mockResolvedValue(user);
		adminMinecraftProfileServiceMock.listByUserPage.mockResolvedValue({
			items: [],
			limit: 5,
			offset: 0,
			total: 0,
		});
	});

	it("uses the account username in the page title", async () => {
		renderPage();

		expect(
			await screen.findByRole("heading", { name: "用户 esap" }),
		).toBeInTheDocument();
		expect(screen.getByText("AptS:1547")).toBeInTheDocument();
		expect(screen.getByText("@esap · esaps@esaps.net")).toBeInTheDocument();
	});
});

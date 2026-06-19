import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/authStore";
import type { AccountOverview, AuditLogEntry, AuthUserInfo } from "@/types/api";
import AccountOverviewPage from "./AccountOverviewPage";

const accountServiceMock = vi.hoisted(() => ({
	overview: vi.fn(),
}));

vi.mock("@/services/accountService", () => ({
	accountService: accountServiceMock,
}));

const baseUser: AuthUserInfo = {
	email: "alex@example.com",
	id: 7,
	profile: {
		avatar: {
			source: "none",
			url_1024: null,
			url_512: null,
			version: 0,
		},
		display_name: null,
	},
	role: "user",
	status: "active",
	username: "alex",
};

const overview: AccountOverview = {
	profile_count: 0,
	recent_activity: [],
};

function auditEntry(entityName: string): AuditLogEntry {
	return {
		action: "user_login",
		created_at: "2026-06-15T08:00:00.000Z",
		details: null,
		entity_id: 7,
		entity_name: entityName,
		entity_type: "user",
		id: 1,
		ip_address: "127.0.0.1",
		presentation: null,
		user: {
			email: "alex@example.com",
			id: 7,
			role: "user",
			status: "active",
			username: "alex",
		},
		user_agent: "vitest",
		user_id: 7,
	};
}

function renderPage(user: AuthUserInfo) {
	useAuthStore.setState({
		user,
		checking: false,
		error: null,
		expiresAt: Date.now() + 60_000,
		isAuthStale: false,
		isAuthenticated: true,
		isAdmin: user.role === "admin",
	});

	return render(
		<MemoryRouter>
			<AccountOverviewPage />
		</MemoryRouter>,
	);
}

describe("AccountOverviewPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		accountServiceMock.overview.mockResolvedValue(overview);
	});

	it("uses the display name in the welcome hero when one is set", () => {
		renderPage({
			...baseUser,
			profile: {
				...baseUser.profile,
				display_name: "Aster",
			},
		});

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Welcome back, Aster",
		);
	});

	it("falls back to the username when the display name is blank", () => {
		renderPage({
			...baseUser,
			profile: {
				...baseUser.profile,
				display_name: "   ",
			},
		});

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Welcome back, alex",
		);
	});

	it("keeps long recent activity target text truncated", async () => {
		const longTarget = `account-activity-${"x".repeat(96)}`;
		accountServiceMock.overview.mockResolvedValue({
			...overview,
			recent_activity: [auditEntry(longTarget)],
		});

		renderPage(baseUser);

		expect(await screen.findByText(new RegExp(longTarget))).toHaveClass(
			"truncate",
		);
	});
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import { adminOverviewService } from "@/services/adminService";
import { useAuthStore } from "@/stores/authStore";
import type { AdminOverview, AuditLogEntry, AuthUserInfo } from "@/types/api";

vi.mock("@/services/adminService", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/services/adminService")>();
	return {
		...actual,
		adminOverviewService: {
			get: vi.fn(),
		},
	};
});

vi.mock("recharts", () => ({
	CartesianGrid: () => <div>recharts-grid</div>,
	Line: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
		<div>{`recharts-line:${dataKey ?? ""}:${name ?? ""}`}</div>
	),
	LineChart: ({
		children,
		data,
	}: {
		children: React.ReactNode;
		data?: Array<{ date: string; label?: string; total_activity?: number }>;
	}) => (
		<div>
			<div>{`recharts-line-chart:${data?.map((point) => `${point.date}:${point.total_activity ?? ""}`).join(",") ?? ""}`}</div>
			<div>{`recharts-line-chart-labels:${data?.map((point) => point.label ?? "").join(",") ?? ""}`}</div>
			{children}
		</div>
	),
	ResponsiveContainer: ({
		children,
		debounce,
	}: {
		children: React.ReactNode;
		debounce?: number;
	}) => (
		<div>
			<div>{`recharts-responsive-container-debounce:${String(debounce ?? "")}`}</div>
			{children}
		</div>
	),
	Tooltip: () => <div>recharts-tooltip</div>,
	XAxis: ({
		dataKey,
		interval,
		minTickGap,
		padding,
	}: {
		dataKey?: string;
		interval?: number | string;
		minTickGap?: number;
		padding?: { left?: number; right?: number };
	}) => (
		<div>
			{`recharts-x-axis:${dataKey ?? ""}:${String(interval ?? "")}:${String(minTickGap ?? "")}:${String(padding?.left ?? "")}:${String(padding?.right ?? "")}`}
		</div>
	),
	YAxis: () => <div>recharts-y-axis</div>,
}));

const adminUser: AuthUserInfo = {
	email: "admin@example.com",
	id: 1,
	profile: {
		avatar: {
			source: "none",
			url_1024: null,
			url_512: null,
			version: 0,
		},
		display_name: "Operator",
	},
	role: "admin",
	status: "active",
	username: "admin",
};

function auditEntry(id: number): AuditLogEntry {
	return {
		action: "user_login",
		created_at: `2026-06-15T08:0${id}:00.000Z`,
		details: null,
		entity_id: id,
		entity_name: `player-${id}`,
		entity_type: "user",
		id,
		ip_address: "127.0.0.1",
		presentation: null,
		user: {
			email: "admin@example.com",
			id: 1,
			role: "admin",
			status: "active",
			username: "admin",
		},
		user_agent: "vitest",
		user_id: 1,
	};
}

function overview(overrides: Partial<AdminOverview> = {}): AdminOverview {
	return {
		activity_trend: [
			{
				active_users: 0,
				active_players: 0,
				date: "2026-06-09",
				new_textures: 0,
				yggdrasil_api_calls: 0,
			},
			{
				active_users: 3,
				active_players: 1,
				date: "2026-06-10",
				new_textures: 2,
				yggdrasil_api_calls: 1,
			},
			{
				active_users: 1,
				active_players: 0,
				date: "2026-06-11",
				new_textures: 1,
				yggdrasil_api_calls: 2,
			},
			{
				active_users: 2,
				active_players: 0,
				date: "2026-06-12",
				new_textures: 0,
				yggdrasil_api_calls: 0,
			},
			{
				active_users: 2,
				active_players: 1,
				date: "2026-06-13",
				new_textures: 1,
				yggdrasil_api_calls: 3,
			},
			{
				active_users: 1,
				active_players: 0,
				date: "2026-06-14",
				new_textures: 2,
				yggdrasil_api_calls: 1,
			},
			{
				active_users: 2,
				active_players: 2,
				date: "2026-06-15",
				new_textures: 3,
				yggdrasil_api_calls: 4,
			},
		],
		recent_activity: [auditEntry(1)],
		services: [
			{
				detail: null,
				key: "database",
				metric: "8 users",
				status: "ok",
			},
			{
				detail: null,
				key: "background_tasks",
				metric: "0 processing / 0 queued",
				status: "ok",
			},
		],
		summary: {
			active_session_count: 4,
			active_yggdrasil_token_count: 5,
			minecraft_profile_count: 6,
			pending_task_count: 0,
			processing_task_count: 0,
			texture_count: 7,
			total_users: 8,
		},
		system_info: {
			build_time: "2026-06-15T08:30:00.000Z",
			uptime_seconds: 3723,
			version: "0.1.0",
		},
		system_health: {
			checked_at: "2026-06-15T08:30:00.000Z",
			components: [
				{
					message: "database check passed",
					name: "database",
					status: "healthy",
				},
			],
			status: "healthy",
			summary: "system health is healthy",
			task_id: 12,
		},
		...overrides,
	};
}

function renderPage() {
	useAuthStore.setState({
		checking: false,
		error: null,
		expiresAt: Date.now() + 60_000,
		isAdmin: true,
		isAuthStale: false,
		isAuthenticated: true,
		user: adminUser,
	});

	return render(
		<MemoryRouter>
			<AdminOverviewPage />
		</MemoryRouter>,
	);
}

describe("AdminOverviewPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useAuthStore.getState().clear();
		vi.mocked(adminOverviewService.get).mockResolvedValue(overview());
	});

	it("renders the loading state before overview data resolves", async () => {
		let resolveOverview: (value: AdminOverview) => void = () => undefined;
		vi.mocked(adminOverviewService.get).mockReturnValue(
			new Promise((resolve) => {
				resolveOverview = resolve;
			}),
		);

		renderPage();

		expect(screen.getByText("Syncing status")).toBeInTheDocument();

		resolveOverview(overview());

		expect(
			await screen.findByText("System running normally"),
		).toBeInTheDocument();
	});

	it("renders summary, service status, activity, and quick actions", async () => {
		renderPage();

		expect(
			await screen.findByText("Welcome back, Operator"),
		).toBeInTheDocument();
		expect(screen.getByText("v0.1.0")).toBeInTheDocument();
		expect(screen.getByText("Total players")).toBeInTheDocument();
		expect(screen.getAllByText("Profiles").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Textures").length).toBeGreaterThan(0);
		expect(screen.getByText("Active tokens")).toBeInTheDocument();
		expect(screen.getAllByText("8").length).toBeGreaterThan(0);
		expect(screen.getAllByText("6").length).toBeGreaterThan(0);
		expect(screen.getAllByText("7").length).toBeGreaterThan(0);
		expect(screen.getAllByText("5").length).toBeGreaterThan(0);
		expect(screen.getByText("Database")).toBeInTheDocument();
		expect(screen.getAllByText("Normal").length).toBeGreaterThan(0);
		expect(screen.getByText("Health check passed")).toBeInTheDocument();
		expect(
			screen.getByText(
				"All required runtime checks passed in the latest system health task.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Daily active users, active players, new textures, and Yggdrasil API calls over the last 7 days.",
			),
		).toBeInTheDocument();
		expect(
			await screen.findByText("recharts-responsive-container-debounce:120"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"recharts-line-chart:2026-06-09:0,2026-06-10:7,2026-06-11:4,2026-06-12:2,2026-06-13:7,2026-06-14:4,2026-06-15:11",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"recharts-line-chart-labels:6/9,6/10,6/11,6/12,6/13,6/14,6/15",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-x-axis:label:0:0:12:12"),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-line:active_users:Active users"),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-line:active_players:Active players"),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-line:new_textures:New textures"),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-line:yggdrasil_api_calls:Yggdrasil API calls"),
		).toBeInTheDocument();
		expect(screen.queryByText("7-day total")).not.toBeInTheDocument();
		expect(screen.queryByText("Daily average")).not.toBeInTheDocument();
		expect(screen.queryByText("Latest day")).not.toBeInTheDocument();
		expect(screen.queryByText("Peak day")).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /View task history/ }),
		).toHaveAttribute("href", "/admin/tasks");
		expect(screen.getByText(/player-1/)).toBeInTheDocument();
		expect(screen.getByText(/player-1/)).toHaveClass("truncate");
		expect(screen.getByRole("link", { name: /Manage users/ })).toHaveAttribute(
			"href",
			"/admin/users",
		);
	});

	it("renders empty activity and service fallbacks", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				activity_trend: [],
				recent_activity: [],
				services: [],
			}),
		);

		renderPage();

		expect(
			await screen.findByText("No audit activity yet."),
		).toBeInTheDocument();
		expect(screen.getByText("No service status.")).toBeInTheDocument();
		expect(screen.getByText("No trend data available.")).toBeInTheDocument();
	});

	it("renders a zero-activity trend without treating it as missing data", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				activity_trend: [
					{
						active_users: 0,
						active_players: 0,
						date: "2026-06-15",
						new_textures: 0,
						yggdrasil_api_calls: 0,
					},
					{
						active_users: 0,
						active_players: 0,
						date: "2026-06-14",
						new_textures: 0,
						yggdrasil_api_calls: 0,
					},
				],
			}),
		);

		renderPage();

		expect(
			await screen.findByText("No activity was recorded in this 7-day window."),
		).toBeInTheDocument();
		expect(
			screen.getByText("recharts-line-chart:2026-06-14:0,2026-06-15:0"),
		).toBeInTheDocument();
		expect(
			screen.queryByText("No trend data available."),
		).not.toBeInTheDocument();
	});

	it("renders queued task warning state from the overview payload", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				services: [
					{
						detail: null,
						key: "background_tasks",
						metric: "2 processing / 3 queued",
						status: "warning",
					},
				],
				summary: {
					active_session_count: 4,
					active_yggdrasil_token_count: 5,
					minecraft_profile_count: 6,
					pending_task_count: 3,
					processing_task_count: 2,
					texture_count: 7,
					total_users: 8,
				},
			}),
		);

		renderPage();

		expect(await screen.findByText("Background tasks")).toBeInTheDocument();
		expect(screen.getByText("Attention")).toBeInTheDocument();
		expect(screen.getByText("2 processing / 3 queued")).toBeInTheDocument();
		expect(screen.getByText("2 / 3")).toBeInTheDocument();
	});

	it("renders degraded system health issues from the latest health check", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				system_health: {
					checked_at: "2026-06-15T08:31:00.000Z",
					components: [
						{
							message: "database check passed",
							name: "database",
							status: "healthy",
						},
						{
							message: "cache backend is unavailable; using fallback",
							name: "cache",
							status: "degraded",
						},
						{
							message: "missing texture object detected",
							name: "yggdrasil_storage_consistency",
							status: "unhealthy",
						},
					],
					status: "degraded",
					summary: "cache degraded",
					task_id: 32,
				},
			}),
		);

		renderPage();

		expect(await screen.findAllByText("System health degraded")).toHaveLength(
			2,
		);
		expect(
			screen.queryByText("System running normally"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(
				"Affected checks: Cache, Yggdrasil storage consistency.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Cache: Degraded")).toBeInTheDocument();
		expect(
			screen.getByText("Yggdrasil storage consistency: Unhealthy"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /View task history/ }),
		).toHaveAttribute("href", "/admin/tasks");
	});

	it("renders unhealthy system health without task details", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				system_health: {
					checked_at: "2026-06-15T08:31:00.000Z",
					components: [],
					status: "unhealthy",
					summary: "runtime dispatcher stalled",
					task_id: 33,
				},
			}),
		);

		renderPage();

		expect(
			await screen.findAllByText("System health requires attention"),
		).toHaveLength(2);
		expect(screen.getByText("runtime dispatcher stalled")).toBeInTheDocument();
		expect(
			screen.queryByText("dispatcher has not reported recently"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("System running normally"),
		).not.toBeInTheDocument();
	});

	it("renders unknown system health without task history when no task exists", async () => {
		vi.mocked(adminOverviewService.get).mockResolvedValue(
			overview({
				system_health: {
					checked_at: null,
					components: [],
					status: "unknown",
					summary: null,
					task_id: null,
				},
			}),
		);

		renderPage();

		expect(
			await screen.findAllByText("Health check not available"),
		).toHaveLength(2);
		expect(screen.getByText("Not checked")).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /View task history/ }),
		).not.toBeInTheDocument();
	});

	it("lets the operator retry after a failed overview load", async () => {
		vi.mocked(adminOverviewService.get)
			.mockRejectedValueOnce(new Error("overview denied"))
			.mockResolvedValueOnce(overview());

		renderPage();

		expect(
			await screen.findAllByText("System health requires attention"),
		).toHaveLength(2);
		expect(
			screen.getByText("Affected checks: Overview API."),
		).toBeInTheDocument();
		expect(screen.getByText("Overview API: Unhealthy")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Retry/ }));

		await waitFor(() => {
			expect(adminOverviewService.get).toHaveBeenCalledTimes(2);
		});
		expect(
			await screen.findByText("Welcome back, Operator"),
		).toBeInTheDocument();
		expect(screen.queryByText("overview denied")).not.toBeInTheDocument();
	});
});

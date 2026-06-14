import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoaders = vi.hoisted(() => ({
	adminA: vi.fn(() => Promise.resolve()),
	adminB: vi.fn(() => Promise.resolve()),
	loginA: vi.fn(() => Promise.resolve()),
	userA: vi.fn(() => Promise.resolve()),
	userB: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/pwaWarmupLoaders", () => ({
	adminRouteWarmupLoaders: [
		{ key: "admin:a", label: "AdminA", load: mockLoaders.adminA },
		{ key: "admin:b", label: "AdminB", load: mockLoaders.adminB },
	],
	loginSuccessPathWarmupLoaders: [
		{ key: "login:a", label: "LoginA", load: mockLoaders.loginA },
	],
	userRouteWarmupLoaders: [
		{ key: "user:a", label: "UserA", load: mockLoaders.userA },
		{ key: "user:b", label: "UserB", load: mockLoaders.userB },
	],
}));

async function loadWarmupModule() {
	vi.resetModules();
	return await import("@/lib/pwaWarmup");
}

async function drainWarmupQueue() {
	await vi.runAllTimersAsync();
}

describe("pwaWarmup", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		Object.values(mockLoaders).forEach((loader) => {
			loader.mockClear();
		});
	});

	it("warms the login success path once", async () => {
		const { warmupLoginSuccessPath } = await loadWarmupModule();

		warmupLoginSuccessPath();
		warmupLoginSuccessPath();
		await drainWarmupQueue();

		expect(mockLoaders.loginA).toHaveBeenCalledTimes(1);
	});

	it("warms user route chunks once", async () => {
		const { warmupRouteChunks } = await loadWarmupModule();

		warmupRouteChunks("user");
		warmupRouteChunks("user");
		await drainWarmupQueue();

		expect(mockLoaders.userA).toHaveBeenCalledTimes(1);
		expect(mockLoaders.userB).toHaveBeenCalledTimes(1);
		expect(mockLoaders.adminA).not.toHaveBeenCalled();
	});

	it("warms user and admin chunks for the first admin queue", async () => {
		const { warmupRouteChunks } = await loadWarmupModule();

		warmupRouteChunks("admin");
		await drainWarmupQueue();

		expect(mockLoaders.userA).toHaveBeenCalledTimes(1);
		expect(mockLoaders.userB).toHaveBeenCalledTimes(1);
		expect(mockLoaders.adminA).toHaveBeenCalledTimes(1);
		expect(mockLoaders.adminB).toHaveBeenCalledTimes(1);
	});

	it("skips user queue after admin has already warmed shared routes", async () => {
		const { warmupRouteChunks } = await loadWarmupModule();

		warmupRouteChunks("admin");
		warmupRouteChunks("user");
		await drainWarmupQueue();

		expect(mockLoaders.userA).toHaveBeenCalledTimes(1);
		expect(mockLoaders.userB).toHaveBeenCalledTimes(1);
		expect(mockLoaders.adminA).toHaveBeenCalledTimes(1);
		expect(mockLoaders.adminB).toHaveBeenCalledTimes(1);
	});
});

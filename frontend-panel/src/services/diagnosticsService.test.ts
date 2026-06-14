import { describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => {
	const get = vi.fn();
	const rootGet = vi.fn();
	const rootClientGet = vi.fn();
	return {
		get,
		rootGet,
		rootClientGet,
	};
});

vi.mock("./http", async () => {
	const actual = await vi.importActual<typeof import("./http")>("./http");
	return {
		...actual,
		api: {
			get: apiMock.get,
			root: {
				get: apiMock.rootGet,
			},
			rootClient: {
				get: apiMock.rootClientGet,
			},
		},
	};
});

describe("diagnosticsService", () => {
	it("creates idle rows for registered endpoints", async () => {
		const { createIdleDiagnostics } = await import("./diagnosticsService");

		const rows = createIdleDiagnostics();

		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "health",
					path: "/health",
					status: "idle",
					value: "not checked",
				}),
				expect.objectContaining({
					id: "auth-check",
					path: "/api/v1/auth/check",
					status: "idle",
				}),
			]),
		);
	});

	it("loads registered public APIs", async () => {
		const controller = new AbortController();
		apiMock.rootClientGet.mockImplementation((path: string) => {
			if (path === "/health") {
				return Promise.resolve({
					data: { status: "ok" },
				});
			}
			throw new Error(`unexpected raw root path ${path}`);
		});
		apiMock.rootGet.mockImplementation((path: string) => {
			if (path === "/health/ready") {
				return Promise.resolve({
					status: "ready",
				});
			}
			throw new Error(`unexpected root path ${path}`);
		});
		apiMock.get.mockImplementation((path: string) => {
			if (path === "/auth/check") {
				return Promise.resolve({ initialized: false });
			}
			if (path === "/auth/external-auth/providers") {
				return Promise.resolve([]);
			}
			throw new Error(`unexpected api path ${path}`);
		});

		const { loadServiceDiagnostics } = await import("./diagnosticsService");

		const rows = await loadServiceDiagnostics(controller.signal);

		expect(apiMock.rootClientGet).toHaveBeenCalledWith("/health", {
			signal: controller.signal,
		});
		expect(apiMock.rootGet).toHaveBeenCalledWith("/health/ready", {
			signal: controller.signal,
		});
		expect(apiMock.get).toHaveBeenCalledWith("/auth/check", {
			signal: controller.signal,
		});
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "health",
					status: "ok",
					value: "ok",
					detail: undefined,
				}),
				expect.objectContaining({
					id: "auth-check",
					status: "ok",
					value: "setup required",
				}),
			]),
		);
	});
});

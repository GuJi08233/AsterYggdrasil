import {
	adminRouteWarmupLoaders,
	loginSuccessPathWarmupLoaders,
	userRouteWarmupLoaders,
	type WarmupLoaderEntry,
} from "@/lib/pwaWarmupLoaders";

const IDLE_TIMEOUT_MS = 3000;
const CHUNK_DELAY_MS = 900;

function scheduleIdle(task: () => void) {
	if (typeof window === "undefined") return;

	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
		return;
	}

	globalThis.setTimeout(task, CHUNK_DELAY_MS);
}

function warmSequentially(loaders: WarmupLoaderEntry[]) {
	let index = 0;

	const runNext = () => {
		const loader = loaders[index];
		if (!loader) return;

		index += 1;
		void loader
			.load()
			.catch(() => undefined)
			.finally(() => {
				scheduleIdle(runNext);
			});
	};

	scheduleIdle(runNext);
}

let warmedUserRoutes = false;
let warmedAdminRoutes = false;
let warmedLoginSuccessPath = false;

export function warmupLoginSuccessPath() {
	if (typeof window === "undefined") return;
	if (warmedLoginSuccessPath) return;

	warmedLoginSuccessPath = true;
	warmSequentially(loginSuccessPathWarmupLoaders);
}

export function warmupRouteChunks(role: "user" | "admin") {
	if (typeof window === "undefined") return;

	const routeLoaders = (() => {
		if (role === "user") {
			if (warmedUserRoutes) return null;
			warmedUserRoutes = true;
			return userRouteWarmupLoaders;
		}

		if (warmedAdminRoutes) return null;

		const loaders = warmedUserRoutes
			? adminRouteWarmupLoaders
			: [...userRouteWarmupLoaders, ...adminRouteWarmupLoaders];
		warmedUserRoutes = true;
		warmedAdminRoutes = true;
		return loaders;
	})();

	if (routeLoaders == null || routeLoaders.length === 0) return;
	warmSequentially(routeLoaders);
}

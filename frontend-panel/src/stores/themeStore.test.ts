import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockMotionPreference(reduced: boolean) {
	vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
		matches: query === "(prefers-reduced-motion: reduce)" ? reduced : false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

async function loadThemeStore() {
	vi.resetModules();
	return import("@/stores/themeStore");
}

describe("theme store transition", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockMotionPreference(false);
		document.head.innerHTML = '<meta name="theme-color" content="#f8faf8" />';
		document.documentElement.className = "";
	});

	afterEach(() => {
		document.head.innerHTML = "";
	});

	it("uses the same fallback transition class as AsterDrive while switching theme", async () => {
		const { useThemeStore } = await loadThemeStore();

		useThemeStore.getState().setMode("dark");

		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).toHaveClass("theme-switching");
		expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
			"content",
			"#111827",
		);

		vi.advanceTimersByTime(219);
		expect(document.documentElement).toHaveClass("theme-switching");

		vi.advanceTimersByTime(1);
		expect(document.documentElement).not.toHaveClass("theme-switching");
	});

	it("skips animation when the user prefers reduced motion", async () => {
		mockMotionPreference(true);
		const { useThemeStore } = await loadThemeStore();

		useThemeStore.getState().setMode("dark");

		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).not.toHaveClass("theme-switching");
	});
});

import { create } from "zustand";

const THEME_STORAGE_KEY = "asteryggdrasil-theme-mode";
const FALLBACK_THEME_TRANSITION_CLASS = "theme-switching";
const FALLBACK_THEME_TRANSITION_DURATION_MS = 220;
const THEME_COLOR_LIGHT = "#f8faf8";
const THEME_COLOR_DARK = "#111827";

const THEME_MODES = {
	light: "light",
	dark: "dark",
} as const;

type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];

type ThemeState = {
	mode: ThemeMode;
	toggle: () => void;
	setMode: (mode: ThemeMode) => void;
};

let fallbackThemeTransitionTimer: ReturnType<typeof setTimeout> | null = null;

function isThemeMode(value: unknown): value is ThemeMode {
	return value === THEME_MODES.light || value === THEME_MODES.dark;
}

function prefersDarkMode() {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return false;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredThemeMode(): ThemeMode {
	if (typeof window === "undefined") return THEME_MODES.light;

	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (isThemeMode(stored)) return stored;
	} catch {
		// Storage can be unavailable in restricted browser contexts.
	}

	return prefersDarkMode() ? THEME_MODES.dark : THEME_MODES.light;
}

function persistThemeMode(mode: ThemeMode) {
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		// Theme still applies for the current tab when persistence is blocked.
	}
}

function updateThemeColor(mode: ThemeMode) {
	const meta = document.querySelector('meta[name="theme-color"]');
	meta?.setAttribute(
		"content",
		mode === THEME_MODES.dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT,
	);
}

function commitThemeMode(mode: ThemeMode) {
	const html = document.documentElement;
	html.classList.toggle("dark", mode === THEME_MODES.dark);
	updateThemeColor(mode);
}

function prefersReducedMotion() {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return false;
	}
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearFallbackThemeTransition() {
	document.documentElement.classList.remove(FALLBACK_THEME_TRANSITION_CLASS);
	if (fallbackThemeTransitionTimer !== null) {
		clearTimeout(fallbackThemeTransitionTimer);
		fallbackThemeTransitionTimer = null;
	}
}

function runThemeTransition(
	updateCallback: () => void,
	options: { animate?: boolean } = {},
) {
	if (
		typeof document === "undefined" ||
		!options.animate ||
		prefersReducedMotion()
	) {
		updateCallback();
		return;
	}

	const html = document.documentElement;
	clearFallbackThemeTransition();
	html.classList.add(FALLBACK_THEME_TRANSITION_CLASS);
	updateCallback();
	fallbackThemeTransitionTimer = setTimeout(() => {
		clearFallbackThemeTransition();
	}, FALLBACK_THEME_TRANSITION_DURATION_MS);
}

function applyThemeMode(mode: ThemeMode, options: { animate?: boolean } = {}) {
	runThemeTransition(() => {
		commitThemeMode(mode);
	}, options);
}

const initialThemeMode = readStoredThemeMode();

export function initThemeRuntime() {
	applyThemeMode(initialThemeMode);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	mode: initialThemeMode,
	toggle: () => {
		const nextMode =
			get().mode === THEME_MODES.dark ? THEME_MODES.light : THEME_MODES.dark;
		persistThemeMode(nextMode);
		applyThemeMode(nextMode, { animate: true });
		set({ mode: nextMode });
	},
	setMode: (mode) => {
		if (!isThemeMode(mode)) return;
		persistThemeMode(mode);
		applyThemeMode(mode, { animate: true });
		set({ mode });
	},
}));

export type { ThemeMode };
export { THEME_MODES };

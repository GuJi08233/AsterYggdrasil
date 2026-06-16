import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PublicEntryShell } from "@/components/layout/PublicEntryShell";
import { DEFAULT_BRANDING } from "@/lib/branding";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: {
			changeLanguage: vi.fn(),
			language: "en-US",
		},
		t: (key: string) => key,
	}),
}));

vi.mock("@/components/common/LanguageMenu", () => ({
	LanguageMenu: () => <div data-testid="language-menu" />,
}));

vi.mock("@/components/layout/ThemeToggleButton", () => ({
	ThemeToggleButton: () => <button type="button" data-testid="theme-toggle" />,
}));

vi.mock("@/components/layout/BrandMark", () => ({
	BrandMark: ({ branding }: { branding: { title: string } }) => (
		<div data-testid="brand-mark">{branding.title}</div>
	),
}));

describe("PublicEntryShell", () => {
	it("uses layered public backdrop surfaces so theme switches can crossfade", () => {
		const { container } = render(
			<MemoryRouter>
				<PublicEntryShell
					branding={DEFAULT_BRANDING}
					title="AsterYggdrasil"
					tagline="Yggdrasil API"
					variant="home"
				>
					<main>Content</main>
				</PublicEntryShell>
			</MemoryRouter>,
		);

		expect(screen.getByRole("banner")).toHaveAttribute(
			"data-theme-surface",
			"chrome",
		);

		const backdropLayers = container.querySelectorAll(
			'[data-theme-surface="public-backdrop"]',
		);
		expect(backdropLayers.length).toBeGreaterThanOrEqual(6);
		expect(
			Array.from(backdropLayers).some((layer) =>
				layer.className.includes("dark:bg-["),
			),
		).toBe(false);
	});
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TextureLibrarySectionNav } from "@/components/admin/TextureLibrarySectionNav";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function renderNav(active: "textures" | "reviews" | "reports" | "tags") {
	render(
		<MemoryRouter>
			<TextureLibrarySectionNav active={active} />
		</MemoryRouter>,
	);
}

describe("TextureLibrarySectionNav", () => {
	it("uses the same admin texture-library links for every section", () => {
		renderNav("tags");

		expect(
			screen.getByRole("link", {
				name: /admin.textureLibraryTexturesPage.allTextures/,
			}),
		).toHaveAttribute("href", "/admin/texture-library");
		expect(
			screen.getByRole("link", {
				name: /admin.textureLibraryTexturesPage.reviewQueue/,
			}),
		).toHaveAttribute("href", "/admin/texture-library/reviews");
		expect(
			screen.getByRole("link", {
				name: /admin.textureLibraryReportsPage.reports/,
			}),
		).toHaveAttribute("href", "/admin/texture-library/reports");
		expect(
			screen.getByRole("link", {
				name: /admin.textureLibraryTexturesPage.tags/,
			}),
		).toHaveAttribute("href", "/admin/texture-library/tags");
	});

	it("keeps section controls visually aligned with the compact header action size", () => {
		renderNav("reviews");

		for (const link of screen.getAllByRole("link")) {
			expect(link).toHaveClass("h-7", "gap-1", "px-2.5", "text-[0.8rem]");
		}
	});
});

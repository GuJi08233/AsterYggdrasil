import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve("src/index.css"), "utf8");

describe("global stylesheet regressions", () => {
	it("keeps browser default scrollbar styling", () => {
		expect(css).not.toContain("::-webkit-scrollbar");
		expect(css).not.toContain("scrollbar-color");
		expect(css).not.toContain("scrollbar-width");
		expect(css).not.toContain("scrollbar-none");
	});

	it("disables vertical overscroll bounce at the document level", () => {
		expect(css).toContain("overscroll-behavior-y: none");
	});

	it("does not draw the public home grid texture overlay", () => {
		expect(css).not.toContain(".public-mc-hero::before");
		expect(css).not.toContain("rgba(255, 255, 255, 0.05) 1px");
	});

	it("keeps AsterDrive-style theme surface transitions", () => {
		expect(css).toContain("html.theme-switching");
		expect(css).toContain("[data-theme-surface]");
		expect(css).toContain('[data-theme-surface="public-backdrop"]');
		expect(css).toContain("transition-duration: 160ms");
		expect(css).toContain("transition-property: opacity");
		expect(css).toContain("aster-view-transition-fade-in");
		expect(css).toContain("aster-view-transition-fade-out");
	});
});

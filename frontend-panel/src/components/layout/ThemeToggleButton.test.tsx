import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { useThemeStore } from "@/stores/themeStore";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe("ThemeToggleButton", () => {
	it("keeps both theme icons mounted for a softer AsterDrive-style switch", () => {
		useThemeStore.setState({ mode: "light" });

		render(<ThemeToggleButton />);

		expect(
			screen.getByRole("button", { name: "shell.themeAction" }),
		).toHaveAttribute("data-theme-surface", "control");
		const button = screen.getByRole("button", { name: "shell.themeAction" });
		expect(button.querySelectorAll("svg")).toHaveLength(2);
		expect(
			button.querySelector(".rotate-0.scale-100.opacity-100"),
		).toBeInTheDocument();
	});
});

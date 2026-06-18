import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIndicator } from "@/components/common/StatusIndicator";

describe("StatusIndicator", () => {
	it("renders as a decorative primary indicator by default", () => {
		const { container } = render(<StatusIndicator />);

		const indicator = container.firstElementChild;
		expect(indicator).toHaveAttribute("aria-hidden", "true");
		expect(indicator).toHaveClass("inline-flex", "size-2", "bg-primary/75");
	});

	it("supports sizes, tones, glow, breathing and custom classes", () => {
		const { container } = render(
			<StatusIndicator breathe className="mt-1" glow size="md" tone="danger" />,
		);

		const indicator = container.firstElementChild;
		expect(indicator).toHaveAttribute("aria-hidden", "true");
		expect(indicator).toHaveClass(
			"mt-1",
			"size-2.5",
			"bg-destructive",
			"shadow-[0_0_0_5px_color-mix(in_oklch,var(--destructive)_16%,transparent)]",
			"status-indicator--breathe",
		);
	});
});

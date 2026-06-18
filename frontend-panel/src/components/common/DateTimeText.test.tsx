import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DateTimeText } from "@/components/common/DateTimeText";
import { i18next } from "@/i18n";
import { formatDateTime } from "@/lib/dateTime";

describe("DateTimeText", () => {
	beforeEach(async () => {
		await i18next.changeLanguage("en-US");
	});

	it("formats timestamps while preserving the raw value for machines and tooltips", () => {
		const value = "2026-06-15T15:27:04.458345Z";

		render(<DateTimeText value={value} />);

		const time = screen.getByText(formatDateTime(value, "en-US"));
		expect(time).toHaveAttribute("datetime", value);
		expect(time).toHaveAttribute("title", value);
	});

	it("renders a fallback for missing timestamps", () => {
		render(<DateTimeText value={null} fallback="Unknown" />);

		expect(screen.getByText("Unknown")).toBeInTheDocument();
	});
});

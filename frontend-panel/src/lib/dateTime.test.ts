import { describe, expect, it } from "vitest";
import { formatDateTime, formatDateTimeOrFallback } from "@/lib/dateTime";

describe("dateTime helpers", () => {
	it("formats valid timestamps with the provided locale", () => {
		expect(formatDateTime("2026-06-15T08:30:00.000Z", "en-US")).toContain(
			"2026",
		);
	});

	it("returns invalid values unchanged", () => {
		expect(formatDateTime("not-a-date", "en-US")).toBe("not-a-date");
	});

	it("uses fallback for missing or unknown timestamps", () => {
		expect(formatDateTimeOrFallback(undefined, "Unknown", "en-US")).toBe(
			"Unknown",
		);
		expect(formatDateTimeOrFallback("unknown", "Unknown", "en-US")).toBe(
			"Unknown",
		);
	});
});

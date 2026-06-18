import { describe, expect, it } from "vitest";
import {
	formatDateTime,
	formatDateTimeOrFallback,
	formatDurationSeconds,
} from "@/lib/dateTime";

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

	it("formats uptime durations with two largest units", () => {
		expect(formatDurationSeconds(3723, "Unknown", "en-US")).toBe(
			"1 hour 2 minutes",
		);
		expect(formatDurationSeconds(3723, "未知", "zh-CN")).toBe("1 小时 2 分钟");
		expect(formatDurationSeconds(undefined, "Unknown", "en-US")).toBe(
			"Unknown",
		);
	});
});

import { describe, expect, it } from "vitest";
import {
	convertNumberUnitValueToBaseUnit,
	formatBytes,
	parseNumberUnitValue,
} from "@/lib/numberUnit";

describe("number unit helpers", () => {
	it("parses and converts integer unit values", () => {
		expect(parseNumberUnitValue(" 12 ")).toBe(12);
		expect(parseNumberUnitValue("1.5")).toBeNull();
		expect(
			convertNumberUnitValueToBaseUnit("2", {
				labelKey: "kib",
				multiplier: 1024,
				value: "kib",
			}),
		).toBe(2048);
	});

	it("formats byte counts with binary units", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(128)).toBe("128 B");
		expect(formatBytes(1536)).toBe("1.5 KiB");
		expect(formatBytes(1024 * 1024)).toBe("1.0 MiB");
	});
});

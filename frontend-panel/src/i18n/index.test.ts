import { beforeEach, describe, expect, it } from "vitest";
import { detectLanguage, persistLanguagePreference } from "@/i18n";
import { readStorageItem, STORAGE_KEYS } from "@/lib/storage";

describe("i18n language preference", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("uses a stored language preference before browser language", () => {
		localStorage.setItem(STORAGE_KEYS.languagePreference, "zh-CN");

		expect(detectLanguage()).toBe("zh-CN");
	});

	it("persists only supported language preferences", () => {
		expect(persistLanguagePreference("zh-CN")).toBe(true);
		expect(readStorageItem("local", STORAGE_KEYS.languagePreference)).toBe(
			"zh-CN",
		);

		expect(persistLanguagePreference("fr-FR")).toBe(false);
		expect(readStorageItem("local", STORAGE_KEYS.languagePreference)).toBe(
			"zh-CN",
		);
	});
});

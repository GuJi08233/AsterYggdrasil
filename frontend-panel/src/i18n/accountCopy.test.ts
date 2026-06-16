import { describe, expect, it } from "vitest";
import enAccount from "@/i18n/locales/en-US/account.json";
import zhAccount from "@/i18n/locales/zh-CN/account.json";

describe("account copy regressions", () => {
	it("warns that wardrobe deletion can remove local files and unbind profiles", () => {
		expect(zhAccount.wardrobe.deleteDialogDescription).toContain(
			"本地材质文件",
		);
		expect(zhAccount.wardrobe.deleteDialogDescription).toContain(
			"解除当前材质绑定",
		);
		expect(zhAccount.wardrobe.deleteDialogDescription).not.toContain(
			"不会被解绑",
		);

		expect(enAccount.wardrobe.deleteDialogDescription).toContain(
			"local texture file",
		);
		expect(enAccount.wardrobe.deleteDialogDescription).toContain("unbound");
		expect(enAccount.wardrobe.deleteDialogDescription).not.toContain(
			"stay unchanged",
		);
	});
});

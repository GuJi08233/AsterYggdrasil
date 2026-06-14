import { describe, expect, it } from "vitest";
import enDashboard from "@/i18n/locales/en-US/dashboard.json";
import zhDashboard from "@/i18n/locales/zh-CN/dashboard.json";

describe("dashboard copy regressions", () => {
	it("warns that wardrobe deletion can remove local files and unbind profiles", () => {
		expect(zhDashboard.wardrobe.deleteDialogDescription).toContain(
			"本地材质文件",
		);
		expect(zhDashboard.wardrobe.deleteDialogDescription).toContain(
			"解除当前材质绑定",
		);
		expect(zhDashboard.wardrobe.deleteDialogDescription).not.toContain(
			"不会被解绑",
		);

		expect(enDashboard.wardrobe.deleteDialogDescription).toContain(
			"local texture file",
		);
		expect(enDashboard.wardrobe.deleteDialogDescription).toContain("unbound");
		expect(enDashboard.wardrobe.deleteDialogDescription).not.toContain(
			"stay unchanged",
		);
	});
});

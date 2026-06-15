import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { resources } from "@/i18n/resources";
import {
	formatAuditDetail,
	formatAuditSummary,
	formatAuditTarget,
} from "@/lib/audit";
import type { AuditLogEntry } from "@/types/api";

type AuditEntrySample = Pick<
	AuditLogEntry,
	"action" | "entity_id" | "entity_name" | "entity_type" | "presentation"
>;

async function tFor(language: keyof typeof resources) {
	const i18n = createInstance();
	await i18n.init({
		defaultNS: "frontend",
		fallbackLng: "en-US",
		interpolation: {
			escapeValue: false,
		},
		lng: language,
		resources,
	});
	return i18n.t.bind(i18n);
}

function renameAuditEntry() {
	return {
		action: "minecraft_profile_rename",
		entity_id: 7,
		entity_name: "RenameNew",
		entity_type: "minecraft_profile",
		presentation: {
			detail: {
				code: "minecraft_profile_renamed",
				params: {
					new_profile_name: "RenameNew",
					old_profile_name: "RenameOld",
					profile_uuid: "00000000000000000000000000000007",
					temporarily_invalidated_token_count: 1,
				},
			},
			summary: {
				code: "minecraft_profile_rename",
				params: {
					new_profile_name: "RenameNew",
					old_profile_name: "RenameOld",
				},
			},
			target: {
				code: "minecraft_profile",
				params: {
					id: 7,
					name: "RenameNew",
				},
			},
		},
	} satisfies AuditEntrySample;
}

describe("audit i18n helpers", () => {
	it("formats Minecraft profile rename audit entries in Chinese", async () => {
		const t = await tFor("zh-CN");
		const entry = renameAuditEntry();

		expect(formatAuditSummary(t, entry)).toBe("重命名 Minecraft 角色档案");
		expect(formatAuditTarget(t, entry)).toBe("RenameNew · Minecraft 角色档案");
		expect(formatAuditDetail(t, entry)).toBe(
			"已将 RenameOld 改名为 RenameNew，临时失效 1 个 token",
		);
	});

	it("formats Minecraft profile rename audit entries in English", async () => {
		const t = await tFor("en-US");
		const entry = renameAuditEntry();

		expect(formatAuditSummary(t, entry)).toBe("Renamed Minecraft profile");
		expect(formatAuditTarget(t, entry)).toBe("RenameNew · Minecraft profile");
		expect(formatAuditDetail(t, entry)).toBe(
			"Renamed RenameOld to RenameNew; temporarily invalidated 1 token(s)",
		);
	});

	it("falls back to the action translation when a summary key is missing", async () => {
		const t = await tFor("zh-CN");
		const entry = {
			...renameAuditEntry(),
			presentation: {
				detail: { code: "unknown_profile_detail" },
				summary: { code: "unknown_profile_action" },
			},
		} satisfies AuditEntrySample;

		expect(formatAuditSummary(t, entry)).toBe("重命名 Minecraft 角色档案");
		expect(formatAuditDetail(t, entry)).toBeUndefined();
	});
});

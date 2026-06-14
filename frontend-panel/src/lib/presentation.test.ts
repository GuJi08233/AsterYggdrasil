import { describe, expect, it } from "vitest";
import {
	formatAuditDetail,
	formatAuditSummary,
	formatAuditTarget,
	formatTaskStatusDetail,
	formatTaskTitle,
} from "@/lib/presentation";
import type { AuditLogEntry, TaskInfo } from "@/types/api";

type TaskPresentationSample = Pick<
	TaskInfo,
	"display_name" | "last_error" | "presentation" | "status_text"
>;

type AuditPresentationSample = Pick<
	AuditLogEntry,
	"action" | "entity_id" | "entity_name" | "entity_type" | "presentation"
>;

describe("presentation helpers", () => {
	it("formats task title and healthy status from task presentation metadata", () => {
		const task = {
			display_name: "system-health-check",
			last_error: null,
			presentation: {
				title: { code: "runtime_task_system_health_check" },
				status: { code: "status_text_system_healthy" },
			},
			status_text: "raw healthy",
		} satisfies TaskPresentationSample;

		expect(formatTaskTitle(task)).toBe("System health check");
		expect(formatTaskStatusDetail(task)).toBe("System healthy");
	});

	it("formats runtime health issue components before raw task status text", () => {
		const task = {
			display_name: "system-health-check",
			last_error: null,
			presentation: {
				status: {
					code: "runtime_system_health_issue_detail",
					params: {
						components: [
							{
								message: "replica lag exceeded threshold",
								name: "database_replica",
								status: "degraded",
							},
						],
						status: "degraded",
					},
				},
			},
			status_text: "raw degraded",
		} satisfies TaskPresentationSample;

		expect(formatTaskStatusDetail(task)).toBe(
			"Database replica Degraded: replica lag exceeded threshold",
		);
	});

	it("keeps task last_error as the highest-priority status detail", () => {
		const task = {
			display_name: "auth-session-cleanup",
			last_error: "delete batch failed",
			presentation: {
				status: { code: "status_text_system_healthy" },
			},
			status_text: "ok",
		} satisfies TaskPresentationSample;

		expect(formatTaskStatusDetail(task)).toBe("delete batch failed");
	});

	it("formats stable failed task status presentation when last_error is absent", () => {
		const task = {
			display_name: "task-cleanup",
			last_error: null,
			presentation: {
				status: {
					code: "status_text_failed",
					params: { error: "artifact directory missing" },
				},
			},
			status_text: null,
		} satisfies TaskPresentationSample;

		expect(formatTaskStatusDetail(task)).toBe(
			"Failed: artifact directory missing",
		);
	});

	it("formats audit summary, target, and cleanup detail from audit presentation metadata", () => {
		const entry = {
			action: "admin_cleanup_tasks",
			entity_id: 42,
			entity_name: null,
			entity_type: "task",
			presentation: {
				detail: {
					code: "tasks_cleanup_finished",
					params: {
						finished_before: "2026-06-07T00:00:00Z",
						removed: 3,
						status: "succeeded",
					},
				},
				summary: { code: "admin_cleanup_tasks" },
				target: {
					code: "task",
					params: {
						id: 42,
					},
				},
			},
		} satisfies AuditPresentationSample;

		expect(formatAuditSummary(entry)).toBe("Tasks cleaned up");
		expect(formatAuditTarget(entry)).toBe("Task · #42");
		expect(formatAuditDetail(entry)).toBe(
			"Removed 3 tasks · Before: 2026-06-07T00:00:00Z; Status: succeeded",
		);
	});

	it("formats minecraft texture binding audit presentation metadata", () => {
		const entry = {
			action: "minecraft_texture_bind",
			entity_id: 9,
			entity_name: "WardrobeUser",
			entity_type: "minecraft_texture",
			presentation: {
				detail: {
					code: "minecraft_texture_bound",
					params: {
						file_size: 156,
						height: 64,
						profile_name: "WardrobeUser",
						profile_uuid: "00000000000000000000000000000001",
						texture_hash: "abc123",
						texture_model: "slim",
						texture_type: "skin",
						width: 64,
					},
				},
				summary: { code: "minecraft_texture_bind" },
				target: {
					code: "minecraft_texture",
					params: {
						id: 9,
						name: "WardrobeUser",
					},
				},
			},
		} satisfies AuditPresentationSample;

		expect(formatAuditSummary(entry)).toBe("Minecraft texture bound");
		expect(formatAuditTarget(entry)).toBe(
			"WardrobeUser · Minecraft texture · #9",
		);
		expect(formatAuditDetail(entry)).toBe(
			"Minecraft texture bound · Profile: WardrobeUser; Profile UUID: 00000000000000000000000000000001; Type: skin; Model: slim; Hash: abc123; Width: 64; Height: 64; File size: 156",
		);
	});

	it("falls back to wire values when presentation metadata is absent or unknown", () => {
		const entry = {
			action: "user_login",
			entity_id: 7,
			entity_name: "admin",
			entity_type: "auth_session",
			presentation: {
				detail: { code: "custom_detail_code" },
			},
		} satisfies AuditPresentationSample;

		expect(formatAuditSummary(entry)).toBe("User login");
		expect(formatAuditTarget(entry)).toBe("admin · Auth session · #7");
		expect(formatAuditDetail(entry)).toBe("Custom detail code");
	});
});

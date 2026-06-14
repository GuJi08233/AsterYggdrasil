import type { TFunction } from "i18next";
import type {
	BackgroundTaskKind,
	BackgroundTaskStatus,
	TaskInfo,
	TaskPresentationMessage,
	TaskStepInfo,
	TaskStepStatus,
} from "@/types/api";

type TaskTranslate = TFunction | ((key: string, values?: object) => string);
type PrimitiveValues = Record<string, number | string>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function humanizeCode(value: string) {
	const words = value.replaceAll("-", "_").split("_").filter(Boolean);
	if (words.length === 0) return value;
	const text = words.join(" ");
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function translateWithFallback(
	t: TaskTranslate,
	key: string,
	values: PrimitiveValues | undefined,
	fallback: string,
) {
	const translated = t(key, values ?? {});
	return translated === key ? fallback : translated;
}

function presentationParams(message: TaskPresentationMessage) {
	return isRecord(message.params) ? message.params : {};
}

function primitivePresentationValues(params: Record<string, unknown>) {
	const values: PrimitiveValues = {};
	for (const [key, value] of Object.entries(params)) {
		if (typeof value === "string" || typeof value === "number") {
			values[key] = value;
		}
	}
	return Object.keys(values).length > 0 ? values : undefined;
}

function runtimeHealthStatusLabel(t: TaskTranslate, status: unknown) {
	if (typeof status !== "string") {
		return null;
	}
	return translateWithFallback(
		t,
		`admin.tasks.runtimeHealth.status.${status}`,
		undefined,
		humanizeCode(status),
	);
}

function runtimeHealthComponentLabel(t: TaskTranslate, name: unknown) {
	if (typeof name !== "string") {
		return null;
	}
	return translateWithFallback(
		t,
		`admin.tasks.runtimeHealth.component.${name}`,
		undefined,
		humanizeCode(name),
	);
}

function formatRuntimeHealthIssueComponent(
	t: TaskTranslate,
	component: unknown,
) {
	if (!isRecord(component)) {
		return null;
	}
	const componentLabel = runtimeHealthComponentLabel(t, component.name);
	const statusLabel = runtimeHealthStatusLabel(t, component.status);
	if (!componentLabel || !statusLabel) {
		return null;
	}
	const summary = translateWithFallback(
		t,
		"admin.tasks.presentation.runtime_health_component_status",
		{ component: componentLabel, status: statusLabel },
		`${componentLabel} ${statusLabel}`,
	);
	const message =
		typeof component.message === "string" ? component.message.trim() : "";
	return message ? `${summary}: ${message}` : summary;
}

function formatRuntimeSystemHealthIssue(
	t: TaskTranslate,
	message: TaskPresentationMessage,
	fallback: string,
) {
	const params = presentationParams(message);
	const components = Array.isArray(params.components)
		? params.components
				.map((component) => formatRuntimeHealthIssueComponent(t, component))
				.filter((component): component is string => Boolean(component))
		: [];
	const status = runtimeHealthStatusLabel(t, params.status);
	const issueText = components.length > 0 ? components.join(", ") : status;
	if (!issueText) {
		return fallback;
	}
	return translateWithFallback(
		t,
		"admin.tasks.presentation.runtime_system_health_issue_detail",
		{ components: issueText },
		issueText,
	);
}

function formatTaskPresentationMessage(
	t: TaskTranslate,
	message: TaskPresentationMessage | null | undefined,
	fallback: string,
) {
	if (!message?.code) {
		return fallback;
	}
	if (message.code === "runtime_system_health_issue_detail") {
		return formatRuntimeSystemHealthIssue(t, message, fallback);
	}
	const params = presentationParams(message);
	const values = primitivePresentationValues(params);
	if (Object.keys(params).length > 0 && !values) {
		return fallback;
	}
	return translateWithFallback(
		t,
		`admin.tasks.presentation.${message.code}`,
		values,
		fallback,
	);
}

export function formatTaskTitle(
	t: TaskTranslate,
	task: Pick<TaskInfo, "display_name" | "presentation">,
) {
	return formatTaskPresentationMessage(
		t,
		task.presentation?.title,
		task.display_name,
	);
}

export function formatTaskDetail(
	t: TaskTranslate,
	task: Pick<TaskInfo, "last_error" | "presentation" | "status_text">,
	emptyFallback = "-",
) {
	const lastError = task.last_error?.trim();
	if (lastError) return lastError;

	const presentation = formatTaskPresentationMessage(
		t,
		task.presentation?.status,
		"",
	);
	if (presentation) return presentation;

	const statusText = task.status_text?.trim();
	return statusText || emptyFallback;
}

export function formatTaskStatusLabel(
	t: TaskTranslate,
	status: BackgroundTaskStatus,
) {
	return translateWithFallback(
		t,
		`admin.tasks.status.${status}`,
		undefined,
		humanizeCode(status),
	);
}

export function formatTaskKind(t: TaskTranslate, kind: BackgroundTaskKind) {
	return translateWithFallback(
		t,
		`admin.tasks.kind.${kind}`,
		undefined,
		humanizeCode(kind),
	);
}

export function formatTaskStepStatus(t: TaskTranslate, status: TaskStepStatus) {
	return translateWithFallback(
		t,
		`admin.tasks.stepStatus.${status}`,
		undefined,
		humanizeCode(status),
	);
}

export function formatTaskStepTitle(
	t: TaskTranslate,
	taskKind: BackgroundTaskKind,
	step: TaskStepInfo,
) {
	return translateWithFallback(
		t,
		`admin.tasks.steps.${taskKind}.${step.key}`,
		undefined,
		step.title,
	);
}

export function taskExecutionAt(task: TaskInfo) {
	return task.started_at ?? task.created_at;
}

export function taskHasExpandableDetails(task: TaskInfo) {
	return (
		task.steps.length > 0 ||
		Boolean(task.last_error?.trim()) ||
		Boolean(task.status_text?.trim()) ||
		task.result != null ||
		task.presentation != null
	);
}

export function taskStatusBadgeClass(status: BackgroundTaskStatus) {
	switch (status) {
		case "succeeded":
			return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300";
		case "failed":
			return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300";
		case "processing":
		case "retry":
			return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300";
		case "pending":
			return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300";
		case "canceled":
			return "border-border bg-muted/30 text-muted-foreground";
	}
}

export function stepProgressPercent(step: TaskStepInfo) {
	if (step.progress_total <= 0) {
		return step.status === "succeeded" ? 100 : 0;
	}
	return Math.max(
		0,
		Math.min(
			100,
			Math.floor((step.progress_current * 100) / step.progress_total),
		),
	);
}

export function stepCircleClass(status: TaskStepStatus) {
	switch (status) {
		case "active":
			return "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15";
		case "succeeded":
			return "border-primary/40 bg-primary/12 text-foreground";
		case "failed":
			return "border-destructive/50 bg-destructive/10 text-destructive";
		case "skipped":
			return "border-border/60 bg-muted/20 text-muted-foreground";
		case "canceled":
			return "border-border/70 bg-muted/35 text-muted-foreground";
		case "pending":
			return "border-border/60 bg-background/90 text-muted-foreground";
	}
}

export function stepCircleLabel(index: number, status: TaskStepStatus) {
	switch (status) {
		case "failed":
			return "!";
		case "canceled":
			return "X";
		default:
			return String(index + 1);
	}
}

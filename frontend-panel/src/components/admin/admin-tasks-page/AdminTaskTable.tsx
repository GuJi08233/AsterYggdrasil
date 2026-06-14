import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
	ADMIN_TABLE_MONO_TEXT_CLASS,
	ADMIN_TABLE_MUTED_TEXT_CLASS,
	AdminSortableTableHead,
	AdminTableCell as TableCell,
	AdminTableHead as TableHead,
	AdminTableHeader as TableHeader,
	AdminTableRow as TableRow,
} from "@/components/common/AdminTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useRetainedDialogValue } from "@/hooks/useRetainedDialogValue";
import type { SortOrder } from "@/lib/pagination";
import {
	formatTaskDetail,
	formatTaskKind,
	formatTaskStatusLabel,
	formatTaskStepStatus,
	formatTaskStepTitle,
	formatTaskTitle,
	stepCircleClass,
	stepCircleLabel,
	stepProgressPercent,
	taskExecutionAt,
	taskHasExpandableDetails,
	taskStatusBadgeClass,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import type {
	AdminTaskSortBy,
	BackgroundTaskStatus,
	TaskInfo,
	TaskStepInfo,
} from "@/types/api";

interface AdminTaskTableHeaderProps {
	onSortChange: (sortBy: AdminTaskSortBy, sortOrder: SortOrder) => void;
	sortBy: AdminTaskSortBy;
	sortOrder: SortOrder;
}

interface AdminTaskTableRowProps {
	formatDateTime: (value: string) => string;
	formatTaskSource: (task: TaskInfo) => ReactNode;
	onOpenDetail: (taskId: number) => void;
	onRetry: (taskId: number) => void;
	retryingTaskId: number | null;
	task: TaskInfo;
}

interface AdminTaskDetailDialogProps {
	detailTask: TaskInfo | null;
	formatDateTime: (value: string) => string;
	formatTaskSource: (task: TaskInfo) => ReactNode;
	onOpenDetailChange: (open: boolean) => void;
	onRetry: (taskId: number) => void;
	retryingTaskId: number | null;
}

function TaskStatusBadge({ status }: { status: BackgroundTaskStatus }) {
	const { t } = useTranslation();
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${taskStatusBadgeClass(status)}`}
		>
			{formatTaskStatusLabel(t, status)}
		</span>
	);
}

function progressText(task: TaskInfo) {
	if (task.progress_total > 0) {
		return `${task.progress_percent}% · ${task.progress_current}/${task.progress_total}`;
	}
	return `${task.progress_percent}%`;
}

function TaskProgress({ task }: { task: TaskInfo }) {
	return (
		<div className="grid min-w-28 gap-1.5">
			<div className="h-1.5 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-[width]"
					style={{
						width: `${Math.max(0, Math.min(100, task.progress_percent))}%`,
					}}
				/>
			</div>
			<span className="text-xs font-medium text-muted-foreground">
				{progressText(task)}
			</span>
		</div>
	);
}

function TaskRetryButton({
	onRetry,
	retrying,
	task,
}: {
	onRetry: (taskId: number) => void;
	retrying: boolean;
	task: TaskInfo;
}) {
	const { t } = useTranslation();

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={!task.can_retry || retrying}
			onClick={(event) => {
				event.stopPropagation();
				onRetry(task.id);
			}}
		>
			<Icon
				name={retrying ? "Spinner" : "Repeat"}
				className={retrying ? "size-4 animate-spin" : "size-4"}
			/>
			{t("admin.tasks.retry")}
		</Button>
	);
}

function TaskMeta({
	formatDateTime,
	label,
	value,
}: {
	formatDateTime?: (value: string) => string;
	label: string;
	value: number | string | null | undefined;
}) {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	const text =
		typeof value === "string" && formatDateTime
			? formatDateTime(value)
			: String(value);
	return (
		<div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2 dark:border-white/10 dark:bg-muted/10">
			<div className="text-[11px] font-semibold tracking-normal text-muted-foreground uppercase">
				{label}
			</div>
			<div className="mt-1 truncate text-sm text-foreground" title={text}>
				{text}
			</div>
		</div>
	);
}

function TaskSteps({
	formatDateTime,
	steps,
	task,
}: {
	formatDateTime: (value: string) => string;
	steps: TaskStepInfo[];
	task: TaskInfo;
}) {
	const { t } = useTranslation();

	if (steps.length === 0) {
		return null;
	}

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-semibold text-foreground">
				{t("admin.tasks.detail.steps")}
			</h3>
			<div className="space-y-2">
				{steps.map((step, index) => {
					const progress = stepProgressPercent(step);
					return (
						<div
							key={step.key}
							className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-border/70 bg-card/65 p-3 dark:border-white/10"
						>
							<div
								className={cn(
									"grid size-8 place-items-center rounded-full border text-xs font-semibold",
									stepCircleClass(step.status),
								)}
							>
								{stepCircleLabel(index, step.status)}
							</div>
							<div className="min-w-0 space-y-2">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="min-w-0">
										<div className="truncate text-sm font-medium text-foreground">
											{formatTaskStepTitle(t, task.kind, step)}
										</div>
										<div className="mt-0.5 text-xs text-muted-foreground">
											{formatTaskStepStatus(t, step.status)}
										</div>
									</div>
									<span className="text-xs font-medium text-muted-foreground">
										{progress}%
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-[width]"
										style={{ width: `${progress}%` }}
									/>
								</div>
								{step.detail ? (
									<p className="text-xs leading-5 text-muted-foreground">
										{step.detail}
									</p>
								) : null}
								<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
									{step.started_at ? (
										<span>
											{t("admin.tasks.detail.startedAt")}:{" "}
											{formatDateTime(step.started_at)}
										</span>
									) : null}
									{step.finished_at ? (
										<span>
											{t("admin.tasks.detail.finishedAt")}:{" "}
											{formatDateTime(step.finished_at)}
										</span>
									) : null}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function RuntimeHealthSummary({ task }: { task: TaskInfo }) {
	const { t } = useTranslation();
	if (task.result?.kind !== "system_runtime" || !task.result.system_health) {
		return null;
	}
	const health = task.result.system_health;

	return (
		<section className="space-y-3">
			<h3 className="text-sm font-semibold text-foreground">
				{t("admin.tasks.detail.runtimeHealth")}
			</h3>
			<div className="rounded-lg border border-border/70 bg-muted/15 p-3 dark:border-white/10 dark:bg-muted/10">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">
						{t(`admin.tasks.runtimeHealth.status.${health.status}`, {
							defaultValue: health.status,
						})}
					</Badge>
					{task.result.duration_ms != null ? (
						<span className="text-xs text-muted-foreground">
							{t("admin.tasks.detail.durationMs", {
								value: task.result.duration_ms,
							})}
						</span>
					) : null}
				</div>
				{health.components.length > 0 ? (
					<div className="mt-3 grid gap-2 md:grid-cols-2">
						{health.components.map((component) => (
							<div
								key={component.name}
								className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 dark:border-white/10 dark:bg-background/45"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate text-sm font-medium text-foreground">
										{t(
											`admin.tasks.runtimeHealth.component.${component.name}`,
											{ defaultValue: component.name },
										)}
									</span>
									<span className="text-xs text-muted-foreground">
										{t(`admin.tasks.runtimeHealth.status.${component.status}`, {
											defaultValue: component.status,
										})}
									</span>
								</div>
								{component.message ? (
									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										{component.message}
									</p>
								) : null}
							</div>
						))}
					</div>
				) : null}
			</div>
		</section>
	);
}

export function AdminTaskTableHeader({
	onSortChange,
	sortBy,
	sortOrder,
}: AdminTaskTableHeaderProps) {
	const { t } = useTranslation();

	return (
		<TableHeader>
			<TableRow>
				<AdminSortableTableHead
					className="min-w-[18rem]"
					sortKey="display_name"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
				>
					{t("admin.tasks.table.task")}
				</AdminSortableTableHead>
				<AdminSortableTableHead
					className="w-[9rem]"
					sortKey="status"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
				>
					{t("common.status")}
				</AdminSortableTableHead>
				<AdminSortableTableHead
					className="w-[11rem]"
					sortKey="progress"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
				>
					{t("admin.tasks.table.progress")}
				</AdminSortableTableHead>
				<TableHead className="w-[13rem]">
					{t("admin.tasks.table.source")}
				</TableHead>
				<AdminSortableTableHead
					className="w-[13rem]"
					sortKey="updated_at"
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSortChange={onSortChange}
				>
					{t("admin.tasks.table.updated")}
				</AdminSortableTableHead>
				<TableHead className="min-w-[18rem]">
					{t("admin.tasks.table.detail")}
				</TableHead>
				<TableHead className="w-[8rem] text-right">
					{t("common.actions")}
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}

export function AdminTaskTableRow({
	formatDateTime,
	formatTaskSource,
	onOpenDetail,
	onRetry,
	retryingTaskId,
	task,
}: AdminTaskTableRowProps) {
	const { t } = useTranslation();
	const expandable = taskHasExpandableDetails(task);
	const detail = formatTaskDetail(t, task);
	const retrying = retryingTaskId === task.id;

	return (
		<TableRow
			className={cn(expandable && "cursor-pointer")}
			role={expandable ? "button" : undefined}
			onClick={() => {
				if (expandable) {
					onOpenDetail(task.id);
				}
			}}
			onKeyDown={(event) => {
				if (!expandable) {
					return;
				}
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onOpenDetail(task.id);
				}
			}}
			tabIndex={expandable ? 0 : undefined}
		>
			<TableCell>
				<div className="grid min-w-0 gap-1">
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate text-sm font-medium text-foreground">
							{formatTaskTitle(t, task)}
						</span>
						{expandable ? (
							<Icon
								name="ArrowSquareOut"
								className="size-3.5 shrink-0 text-muted-foreground"
							/>
						) : null}
					</div>
					<span className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
						{formatTaskKind(t, task.kind)}
					</span>
				</div>
			</TableCell>
			<TableCell>
				<TaskStatusBadge status={task.status} />
			</TableCell>
			<TableCell>
				<TaskProgress task={task} />
			</TableCell>
			<TableCell>
				<div className="min-w-0 text-sm">{formatTaskSource(task)}</div>
			</TableCell>
			<TableCell>
				<span
					className="whitespace-nowrap text-xs text-muted-foreground"
					title={formatDateTime(task.updated_at)}
				>
					{formatDateTime(taskExecutionAt(task))}
				</span>
			</TableCell>
			<TableCell>
				<span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
					{detail}
				</span>
			</TableCell>
			<TableCell className="text-right">
				<TaskRetryButton task={task} retrying={retrying} onRetry={onRetry} />
			</TableCell>
		</TableRow>
	);
}

export function AdminTaskDetailDialog({
	detailTask,
	formatDateTime,
	formatTaskSource,
	onOpenDetailChange,
	onRetry,
	retryingTaskId,
}: AdminTaskDetailDialogProps) {
	const { t } = useTranslation();
	const { retainedValue: retainedTask, handleOpenChangeComplete } =
		useRetainedDialogValue(detailTask, detailTask !== null);

	return (
		<Dialog
			open={detailTask !== null}
			onOpenChange={onOpenDetailChange}
			onOpenChangeComplete={handleOpenChangeComplete}
		>
			{retainedTask ? (
				<DialogContent
					keepMounted
					id={`admin-task-detail-${retainedTask.id}`}
					className="flex max-h-[min(860px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(920px,calc(100vw-2rem))]"
				>
					<DialogHeader className="shrink-0 border-b border-border/70 px-6 pt-5 pb-4 pr-14 dark:border-white/10 max-lg:px-4 max-lg:pt-4">
						<DialogTitle className="truncate text-lg">
							{formatTaskTitle(t, retainedTask)}
						</DialogTitle>
						<div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
							<span className={ADMIN_TABLE_MONO_TEXT_CLASS}>
								#{retainedTask.id}
							</span>
							<span>{formatTaskKind(t, retainedTask.kind)}</span>
							<TaskStatusBadge status={retainedTask.status} />
						</div>
					</DialogHeader>
					<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4 max-lg:px-4">
						<div className="grid gap-3 md:grid-cols-3">
							<div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2 dark:border-white/10 dark:bg-muted/10">
								<div className="text-[11px] font-semibold tracking-normal text-muted-foreground uppercase">
									{t("admin.tasks.detail.source")}
								</div>
								<div className="mt-1 truncate text-sm text-foreground">
									{formatTaskSource(retainedTask)}
								</div>
							</div>
							<TaskMeta
								label={t("admin.tasks.detail.createdAt")}
								value={retainedTask.created_at}
								formatDateTime={formatDateTime}
							/>
							<TaskMeta
								label={t("admin.tasks.detail.updatedAt")}
								value={retainedTask.updated_at}
								formatDateTime={formatDateTime}
							/>
							<TaskMeta
								label={t("admin.tasks.detail.startedAt")}
								value={retainedTask.started_at}
								formatDateTime={formatDateTime}
							/>
							<TaskMeta
								label={t("admin.tasks.detail.finishedAt")}
								value={retainedTask.finished_at}
								formatDateTime={formatDateTime}
							/>
							<TaskMeta
								label={t("admin.tasks.detail.attempts")}
								value={`${retainedTask.attempt_count}/${retainedTask.max_attempts}`}
							/>
						</div>

						<section className="space-y-2">
							<h3 className="text-sm font-semibold text-foreground">
								{t("admin.tasks.detail.currentState")}
							</h3>
							<div className="rounded-lg border border-border/70 bg-muted/15 p-3 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-muted/10">
								{formatTaskDetail(t, retainedTask)}
							</div>
						</section>

						<TaskSteps
							formatDateTime={formatDateTime}
							steps={retainedTask.steps}
							task={retainedTask}
						/>
						<RuntimeHealthSummary task={retainedTask} />
					</div>
					{retainedTask.can_retry ? (
						<DialogFooter className="shrink-0 border-t border-border/70 px-6 py-3 dark:border-white/10 max-lg:px-4">
							<TaskRetryButton
								task={retainedTask}
								retrying={retryingTaskId === retainedTask.id}
								onRetry={onRetry}
							/>
						</DialogFooter>
					) : null}
				</DialogContent>
			) : null}
		</Dialog>
	);
}

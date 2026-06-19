import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminOffsetPagination } from "@/components/admin/AdminOffsetPagination";
import { AdminTaskCleanupDialog } from "@/components/admin/admin-tasks-page/AdminTaskCleanupDialog";
import { AdminTaskFiltersToolbar } from "@/components/admin/admin-tasks-page/AdminTaskFiltersToolbar";
import {
	AdminTaskDetailDialog,
	AdminTaskTableHeader,
	AdminTaskTableRow,
} from "@/components/admin/admin-tasks-page/AdminTaskTable";
import { AdminTableList } from "@/components/common/AdminTableList";
import { DateTimeText } from "@/components/common/DateTimeText";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { handleApiError } from "@/hooks/useApiError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { dateTimeLocalToIso } from "@/lib/form";
import {
	parsePageSizeOption,
	parsePageSizeSearchParam,
} from "@/lib/pagination";
import { formatTaskStatusLabel } from "@/lib/tasks";
import { adminTaskService } from "@/services/adminService";
import type {
	AdminTaskCleanupRequest,
	BackgroundTaskStatus,
	DateTimeIdCursor,
	TaskInfo,
} from "@/types/api";

const TASK_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_TASK_PAGE_SIZE = 20 as const;
const TASK_MANAGED_QUERY_KEYS = ["pageSize", "status"] as const;
const TASK_STATUS_FILTER_VALUES = [
	"pending",
	"processing",
	"retry",
	"succeeded",
	"failed",
	"canceled",
] as const satisfies readonly BackgroundTaskStatus[];
const TASK_TERMINAL_STATUS_FILTER_VALUES = [
	"succeeded",
	"failed",
	"canceled",
] as const satisfies readonly BackgroundTaskStatus[];
const DEFAULT_TASK_CLEANUP_LOOKBACK_HOURS = 24;

type TaskStatusFilter = "__all__" | BackgroundTaskStatus;
type TaskTerminalStatusFilter =
	| "__all__"
	| (typeof TASK_TERMINAL_STATUS_FILTER_VALUES)[number];
type ManagedTaskQuery = {
	pageSize: (typeof TASK_PAGE_SIZE_OPTIONS)[number];
	status: TaskStatusFilter;
};
type AdminTasksUiState = {
	cleanupDialogOpen: boolean;
	cleanupFinishedBefore: string;
	cleanupStatusFilter: TaskTerminalStatusFilter;
	cleanupSubmitting: boolean;
	detailDialogTaskId: number | null;
};
type AdminTasksUiAction =
	| { open: boolean; type: "set_cleanup_dialog_open" }
	| { taskId: number | null; type: "set_detail_dialog_task" }
	| { value: string; type: "set_cleanup_finished_before" }
	| { value: TaskTerminalStatusFilter; type: "set_cleanup_status_filter" }
	| { submitting: boolean; type: "set_cleanup_submitting" }
	| { type: "reset_cleanup_conditions" };

function parseTaskStatusSearchParam(value: string | null): TaskStatusFilter {
	return TASK_STATUS_FILTER_VALUES.includes(
		value as (typeof TASK_STATUS_FILTER_VALUES)[number],
	)
		? (value as BackgroundTaskStatus)
		: "__all__";
}

function parseTaskTerminalStatus(
	value: string | null,
): TaskTerminalStatusFilter {
	return TASK_TERMINAL_STATUS_FILTER_VALUES.includes(
		value as (typeof TASK_TERMINAL_STATUS_FILTER_VALUES)[number],
	)
		? (value as TaskTerminalStatusFilter)
		: "__all__";
}

function buildManagedTaskSearchParams({ pageSize, status }: ManagedTaskQuery) {
	const params = new URLSearchParams();
	if (pageSize !== DEFAULT_TASK_PAGE_SIZE) {
		params.set("pageSize", String(pageSize));
	}
	if (status !== "__all__") {
		params.set("status", status);
	}
	return params;
}

function readManagedTaskQuery(searchParams: URLSearchParams): ManagedTaskQuery {
	return {
		pageSize: parsePageSizeSearchParam(
			searchParams.get("pageSize"),
			TASK_PAGE_SIZE_OPTIONS,
			DEFAULT_TASK_PAGE_SIZE,
		),
		status: parseTaskStatusSearchParam(searchParams.get("status")),
	};
}

function mergeManagedTaskSearchParams(
	searchParams: URLSearchParams,
	managedSearchParams: URLSearchParams,
) {
	const merged = new URLSearchParams(searchParams);
	for (const key of TASK_MANAGED_QUERY_KEYS) {
		merged.delete(key);
	}
	for (const [key, value] of managedSearchParams.entries()) {
		merged.set(key, value);
	}
	return merged;
}

function defaultCleanupFinishedBeforeValue() {
	const date = new Date(
		Date.now() - DEFAULT_TASK_CLEANUP_LOOKBACK_HOURS * 60 * 60 * 1000,
	);
	const offset = date.getTimezoneOffset();
	const local = new Date(date.getTime() - offset * 60 * 1000);
	return local.toISOString().slice(0, 16);
}

function createInitialAdminTasksUiState(): AdminTasksUiState {
	return {
		cleanupDialogOpen: false,
		cleanupFinishedBefore: defaultCleanupFinishedBeforeValue(),
		cleanupStatusFilter: "__all__",
		cleanupSubmitting: false,
		detailDialogTaskId: null,
	};
}

function adminTasksUiReducer(
	state: AdminTasksUiState,
	action: AdminTasksUiAction,
): AdminTasksUiState {
	switch (action.type) {
		case "set_cleanup_dialog_open":
			return { ...state, cleanupDialogOpen: action.open };
		case "set_detail_dialog_task":
			return { ...state, detailDialogTaskId: action.taskId };
		case "set_cleanup_finished_before":
			return { ...state, cleanupFinishedBefore: action.value };
		case "set_cleanup_status_filter":
			return { ...state, cleanupStatusFilter: action.value };
		case "set_cleanup_submitting":
			return { ...state, cleanupSubmitting: action.submitting };
		case "reset_cleanup_conditions":
			return {
				...state,
				cleanupFinishedBefore: defaultCleanupFinishedBeforeValue(),
				cleanupStatusFilter: "__all__",
			};
	}
}

function buildCleanupRequest(
	cleanupFinishedBefore: string,
	cleanupStatusFilter: TaskTerminalStatusFilter,
): AdminTaskCleanupRequest | null {
	const finishedBefore = dateTimeLocalToIso(cleanupFinishedBefore);
	if (finishedBefore == null) {
		return null;
	}
	return {
		finished_before: finishedBefore,
		...(cleanupStatusFilter !== "__all__"
			? { status: cleanupStatusFilter }
			: {}),
	};
}

function taskSourceLabel(
	t: ReturnType<typeof useTranslation>["t"],
	task: TaskInfo,
): ReactNode {
	if (task.creator) {
		return (
			<div className="min-w-0">
				<div className="truncate text-sm font-medium text-foreground">
					{task.creator.username}
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{task.creator.email}
				</div>
			</div>
		);
	}
	if (task.creator_user_id != null) {
		return t("admin.tasks.source.userId", { id: task.creator_user_id });
	}
	return t("admin.tasks.source.system");
}

export default function AdminTasksPage() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();

	usePageTitle(t("admin.tasks.title"));

	const taskQuery = readManagedTaskQuery(searchParams);
	const { pageSize, status: statusFilter } = taskQuery;
	const [retryingTaskId, setRetryingTaskId] = useState<number | null>(null);
	const [cursorStack, setCursorStack] = useState<DateTimeIdCursor[]>([]);
	const [nextCursor, setNextCursor] = useState<DateTimeIdCursor | null>(null);
	const [items, setItems] = useState<TaskInfo[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [uiState, dispatchUi] = useReducer(
		adminTasksUiReducer,
		undefined,
		createInitialAdminTasksUiState,
	);
	const {
		cleanupDialogOpen,
		cleanupFinishedBefore,
		cleanupStatusFilter,
		cleanupSubmitting,
		detailDialogTaskId,
	} = uiState;
	const setTaskQuery = useCallback(
		(updates: Partial<ManagedTaskQuery>) => {
			const nextManagedSearchParams = buildManagedTaskSearchParams({
				...taskQuery,
				...updates,
			});
			setSearchParams(
				mergeManagedTaskSearchParams(searchParams, nextManagedSearchParams),
				{ replace: true },
			);
		},
		[searchParams, setSearchParams, taskQuery],
	);
	const resetCursor = useCallback(() => {
		setCursorStack((current) => (current.length > 0 ? [] : current));
		setNextCursor((current) => (current ? null : current));
	}, []);

	const loadPage = useCallback(
		async (stack: DateTimeIdCursor[]) => {
			setLoading(true);
			try {
				setError(null);
				const cursor = stack.at(-1);
				const page = await adminTaskService.list({
					limit: pageSize,
					after_updated_at: cursor?.value,
					after_id: cursor?.id,
					...(statusFilter !== "__all__" ? { status: statusFilter } : {}),
				});
				if (page.items.length === 0 && page.total > 0 && stack.length > 0) {
					setCursorStack((current) => current.slice(0, -1));
					setNextCursor(null);
					return;
				}
				setItems(page.items);
				setTotal(page.total);
				setNextCursor(page.next_cursor ?? null);
			} catch (error) {
				setError(error instanceof Error ? error.message : String(error));
			} finally {
				setLoading(false);
			}
		},
		[pageSize, statusFilter],
	);
	const reload = useCallback(async () => {
		await loadPage(cursorStack);
	}, [cursorStack, loadPage]);
	const reloadFirstPage = useCallback(async () => {
		setCursorStack([]);
		setNextCursor(null);
		await loadPage([]);
	}, [loadPage]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const activeFilterCount = statusFilter !== "__all__" ? 1 : 0;
	const hasServerFilters = activeFilterCount > 0;
	const totalPages = Math.max(cursorStack.length + (nextCursor ? 2 : 1), 1);
	const currentPage = cursorStack.length + 1;
	const prevPageDisabled = cursorStack.length === 0;
	const nextPageDisabled = !nextCursor;
	const visibleDetailTaskId =
		detailDialogTaskId != null &&
		items.some((task) => task.id === detailDialogTaskId)
			? detailDialogTaskId
			: null;
	const detailTask =
		items.find((task) => task.id === visibleDetailTaskId) ?? null;
	const pageSizeOptions = TASK_PAGE_SIZE_OPTIONS.map((size) => ({
		label: t("admin.pagination.pageSizeOption", { count: size }),
		value: String(size),
	}));
	const taskStatusFilterOptions = [
		{ label: t("admin.tasks.filters.allStatuses"), value: "__all__" },
		...TASK_STATUS_FILTER_VALUES.map((value) => ({
			label: formatTaskStatusLabel(t, value),
			value,
		})),
	] satisfies ReadonlyArray<{ label: string; value: string }>;
	const cleanupStatusFilterOptions = [
		{ label: t("admin.tasks.cleanup.allCompletedStatuses"), value: "__all__" },
		...TASK_TERMINAL_STATUS_FILTER_VALUES.map((value) => ({
			label: formatTaskStatusLabel(t, value),
			value,
		})),
	] satisfies ReadonlyArray<{ label: string; value: string }>;
	const cleanupRequest = buildCleanupRequest(
		cleanupFinishedBefore,
		cleanupStatusFilter,
	);

	const resetFilters = useCallback(() => {
		resetCursor();
		setTaskQuery({ status: "__all__" });
	}, [resetCursor, setTaskQuery]);
	const resetCleanupConditions = () => {
		dispatchUi({ type: "reset_cleanup_conditions" });
	};
	const handlePageSizeChange = useCallback(
		(value: string | null) => {
			const next = parsePageSizeOption(value, TASK_PAGE_SIZE_OPTIONS);
			if (next == null) {
				return;
			}
			resetCursor();
			setTaskQuery({ pageSize: next });
		},
		[resetCursor, setTaskQuery],
	);
	const handleStatusFilterChange = (value: string | null) => {
		resetCursor();
		setTaskQuery({
			status:
				value === "__all__" ? "__all__" : parseTaskStatusSearchParam(value),
		});
	};
	const handleCleanupSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (cleanupRequest == null) {
			return;
		}

		dispatchUi({ submitting: true, type: "set_cleanup_submitting" });
		try {
			const result = await adminTaskService.cleanup(cleanupRequest);
			toast.success(
				t("admin.tasks.cleanup.success", { count: result.removed }),
			);
			dispatchUi({ open: false, type: "set_cleanup_dialog_open" });
			await reloadFirstPage();
		} catch (error) {
			handleApiError(error);
		} finally {
			dispatchUi({ submitting: false, type: "set_cleanup_submitting" });
		}
	};
	const handleRetry = async (taskId: number) => {
		if (retryingTaskId !== null) {
			return;
		}

		setRetryingTaskId(taskId);
		try {
			await adminTaskService.retry(taskId);
			toast.success(t("admin.tasks.retryQueued"));
			await reload();
		} catch (error) {
			handleApiError(error);
		} finally {
			setRetryingTaskId(null);
		}
	};
	const cleanupDescription =
		cleanupRequest == null ? (
			t("admin.tasks.cleanup.invalidDescription")
		) : (
			<>
				{t("admin.tasks.cleanup.confirmDescriptionPrefix")}{" "}
				<DateTimeText value={cleanupRequest.finished_before} />{" "}
				{t("admin.tasks.cleanup.confirmDescriptionSuffix", {
					status:
						cleanupRequest.status != null
							? formatTaskStatusLabel(t, cleanupRequest.status)
							: t("admin.tasks.cleanup.allCompletedStatuses"),
				})}
			</>
		);
	const pagination = useMemo(
		() => (
			<AdminOffsetPagination
				currentPage={currentPage}
				nextDisabled={nextPageDisabled}
				onNext={() => {
					if (!nextCursor) return;
					setCursorStack((current) => [...current, nextCursor]);
				}}
				onPageSizeChange={handlePageSizeChange}
				onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
				pageSize={String(pageSize)}
				pageSizeOptions={pageSizeOptions}
				prevDisabled={prevPageDisabled}
				total={total}
				totalPages={totalPages}
			/>
		),
		[
			currentPage,
			handlePageSizeChange,
			nextPageDisabled,
			pageSize,
			pageSizeOptions,
			prevPageDisabled,
			nextCursor,
			total,
			totalPages,
		],
	);
	const toolbar = (
		<AdminTaskFiltersToolbar
			activeFilterCount={activeFilterCount}
			onResetFilters={resetFilters}
			onStatusChange={handleStatusFilterChange}
			statusFilter={statusFilter}
			statusLabel={t("common.status")}
			statusOptions={taskStatusFilterOptions}
		/>
	);
	const headerRow = useMemo(() => <AdminTaskTableHeader />, []);
	const emptyIcon = useMemo(
		() => <Icon name="Queue" className="size-10" />,
		[],
	);
	const emptyAction = hasServerFilters ? (
		<Button type="button" variant="outline" onClick={resetFilters}>
			{t("admin.clearFilters")}
		</Button>
	) : null;

	return (
		<AdminPageShell>
			<AdminPageHeader
				title={t("admin.tasks.title")}
				description={t("admin.tasks.description")}
				actions={
					<>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								dispatchUi({ open: true, type: "set_cleanup_dialog_open" })
							}
							disabled={cleanupSubmitting}
						>
							<Icon name="Trash" className="size-4" />
							{t("admin.tasks.cleanup.action")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void reload()}
							disabled={loading || cleanupSubmitting}
						>
							<Icon
								name={loading ? "Spinner" : "ArrowsClockwise"}
								className={loading ? "size-4 animate-spin" : "size-4"}
							/>
							{t("common.refresh")}
						</Button>
					</>
				}
				toolbar={toolbar}
			/>

			{error && items.length === 0 ? (
				<AdminSurface padded={false}>
					<EmptyState
						icon={<Icon name="CircleAlert" className="size-5" />}
						title={t("admin.tasks.loadErrorTitle")}
						description={error}
						action={
							<Button
								type="button"
								variant="outline"
								onClick={() => void reload()}
							>
								{t("common.refresh")}
							</Button>
						}
					/>
				</AdminSurface>
			) : (
				<AdminTableList
					columns={7}
					emptyDescription={t("admin.tasks.emptyDescription")}
					emptyIcon={emptyIcon}
					emptyTitle={t("admin.tasks.emptyTitle")}
					filtered={hasServerFilters}
					filteredEmptyAction={emptyAction}
					filteredEmptyDescription={t("admin.tasks.filteredEmptyDescription")}
					filteredEmptyTitle={t("admin.tasks.filteredEmptyTitle")}
					headerRow={headerRow}
					items={items}
					loading={loading}
					pagination={pagination}
					renderRow={(task) => (
						<AdminTaskTableRow
							key={task.id}
							formatTaskSource={(item) => taskSourceLabel(t, item)}
							onOpenDetail={(taskId) =>
								dispatchUi({
									taskId,
									type: "set_detail_dialog_task",
								})
							}
							onRetry={(taskId) => void handleRetry(taskId)}
							retryingTaskId={retryingTaskId}
							task={task}
						/>
					)}
					rows={6}
				/>
			)}

			<AdminTaskDetailDialog
				detailTask={detailTask}
				formatTaskSource={(task) => taskSourceLabel(t, task)}
				onOpenDetailChange={(open) => {
					if (!open) {
						dispatchUi({
							taskId: null,
							type: "set_detail_dialog_task",
						});
					}
				}}
				onRetry={(taskId) => void handleRetry(taskId)}
				retryingTaskId={retryingTaskId}
			/>

			<AdminTaskCleanupDialog
				description={cleanupDescription}
				finishedBefore={cleanupFinishedBefore}
				onFinishedBeforeChange={(value) =>
					dispatchUi({
						type: "set_cleanup_finished_before",
						value,
					})
				}
				onOpenChange={(open) =>
					dispatchUi({ open, type: "set_cleanup_dialog_open" })
				}
				onResetConditions={resetCleanupConditions}
				onStatusFilterChange={(value) =>
					dispatchUi({
						type: "set_cleanup_status_filter",
						value: parseTaskTerminalStatus(value),
					})
				}
				onSubmit={handleCleanupSubmit}
				open={cleanupDialogOpen}
				statusFilter={cleanupStatusFilter}
				statusOptions={cleanupStatusFilterOptions}
				submitDisabled={cleanupRequest == null || cleanupSubmitting}
				submitting={cleanupSubmitting}
			/>
		</AdminPageShell>
	);
}

import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AdminOffsetPagination } from "@/components/admin/AdminOffsetPagination";
import { AdminFilterToolbar } from "@/components/common/AdminFilterToolbar";
import {
	ADMIN_TABLE_MONO_TEXT_CLASS,
	ADMIN_TABLE_MUTED_TEXT_CLASS,
	AdminTableCell,
	AdminTableHead,
	AdminTableHeader,
	AdminTableRow,
} from "@/components/common/AdminTable";
import { AdminTableList } from "@/components/common/AdminTableList";
import { DateTimeText } from "@/components/common/DateTimeText";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
	AUDIT_ENTITY_TYPE_FILTER_VALUES,
	formatAuditDetail,
	formatAuditEntityType,
	formatAuditSummary,
	formatAuditTarget,
	formatAuditTargetType,
	getAuditActionBadgeClass,
	isAuditEntityType,
} from "@/lib/audit";
import {
	parsePageSizeOption,
	parsePageSizeSearchParam,
} from "@/lib/pagination";
import type {
	AuditEntityType,
	AuditLogEntry,
	AuditLogPage as AuditLogPageData,
	DateTimeIdCursor,
} from "@/types/api";

const AUDIT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_AUDIT_PAGE_SIZE = 20 as const;
const AUDIT_MANAGED_QUERY_KEYS = ["action", "entityType", "pageSize"] as const;

type AuditEntityTypeFilter = "__all__" | AuditEntityType;
type AuditQueryState = {
	actionFilter: string;
	cursorStack: DateTimeIdCursor[];
	entityTypeFilter: AuditEntityTypeFilter;
	nextCursor: DateTimeIdCursor | null;
	pageSize: (typeof AUDIT_PAGE_SIZE_OPTIONS)[number];
};
type AuditQueryAction =
	| { type: "replace"; value: AuditQueryState }
	| { type: "reset_filters" }
	| { type: "set_action_filter"; value: string }
	| { type: "set_entity_type_filter"; value: AuditEntityTypeFilter }
	| { type: "next_page" }
	| { type: "previous_page" }
	| { type: "set_next_cursor"; value: DateTimeIdCursor | null }
	| { type: "set_page_size"; value: (typeof AUDIT_PAGE_SIZE_OPTIONS)[number] }
	| { type: "reset_cursor" };

type AuditLogPageProps = {
	list: (query: {
		action?: string;
		after_created_at?: string;
		after_id?: number;
		entity_type?: AuditEntityType;
		limit: number;
	}) => Promise<AuditLogPageData>;
	showActor: boolean;
	translationPrefix: "account.auditPage" | "admin.auditPage";
};

function parseEntityTypeSearchParam(
	value: string | null,
): AuditEntityTypeFilter {
	const normalized = value?.trim();
	return normalized && isAuditEntityType(normalized) ? normalized : "__all__";
}

function buildManagedAuditSearchParams({
	action,
	entityType,
	pageSize,
}: {
	action: string;
	entityType: AuditEntityTypeFilter;
	pageSize: (typeof AUDIT_PAGE_SIZE_OPTIONS)[number];
}) {
	const params = new URLSearchParams();
	if (action.trim()) params.set("action", action.trim());
	if (entityType !== "__all__") params.set("entityType", entityType);
	if (pageSize !== DEFAULT_AUDIT_PAGE_SIZE) {
		params.set("pageSize", String(pageSize));
	}
	return params;
}

function getManagedAuditSearchString(searchParams: URLSearchParams) {
	return buildManagedAuditSearchParams({
		action: searchParams.get("action") ?? "",
		entityType: parseEntityTypeSearchParam(searchParams.get("entityType")),
		pageSize: parsePageSizeSearchParam(
			searchParams.get("pageSize"),
			AUDIT_PAGE_SIZE_OPTIONS,
			DEFAULT_AUDIT_PAGE_SIZE,
		),
	}).toString();
}

function parseAuditQueryState(searchParams: URLSearchParams): AuditQueryState {
	return {
		actionFilter: searchParams.get("action") ?? "",
		cursorStack: [],
		entityTypeFilter: parseEntityTypeSearchParam(
			searchParams.get("entityType"),
		),
		nextCursor: null,
		pageSize: parsePageSizeSearchParam(
			searchParams.get("pageSize"),
			AUDIT_PAGE_SIZE_OPTIONS,
			DEFAULT_AUDIT_PAGE_SIZE,
		),
	};
}

function auditQueryStatesEqual(left: AuditQueryState, right: AuditQueryState) {
	return (
		left.actionFilter === right.actionFilter &&
		left.entityTypeFilter === right.entityTypeFilter &&
		left.pageSize === right.pageSize
	);
}

function auditQueryReducer(
	state: AuditQueryState,
	action: AuditQueryAction,
): AuditQueryState {
	switch (action.type) {
		case "replace":
			return auditQueryStatesEqual(state, action.value) ? state : action.value;
		case "reset_filters":
			return {
				...state,
				actionFilter: "",
				entityTypeFilter: "__all__",
				cursorStack: [],
				nextCursor: null,
			};
		case "set_action_filter":
			return resetCursor({ ...state, actionFilter: action.value });
		case "set_entity_type_filter":
			return resetCursor({ ...state, entityTypeFilter: action.value });
		case "next_page":
			if (!state.nextCursor) return state;
			return {
				...state,
				cursorStack: [...state.cursorStack, state.nextCursor],
				nextCursor: null,
			};
		case "previous_page":
			return {
				...state,
				cursorStack: state.cursorStack.slice(0, -1),
				nextCursor: null,
			};
		case "set_next_cursor":
			return { ...state, nextCursor: action.value };
		case "set_page_size":
			return resetCursor({ ...state, pageSize: action.value });
		case "reset_cursor":
			return resetCursor(state);
	}
}

function resetCursor(state: AuditQueryState): AuditQueryState {
	return { ...state, cursorStack: [], nextCursor: null };
}

function mergeManagedAuditSearchParams(
	searchParams: URLSearchParams,
	managedSearchParams: URLSearchParams,
) {
	const merged = new URLSearchParams(searchParams);
	for (const key of AUDIT_MANAGED_QUERY_KEYS) {
		merged.delete(key);
	}
	for (const [key, value] of managedSearchParams.entries()) {
		merged.set(key, value);
	}
	return merged;
}

export function AuditLogPage({
	list,
	showActor,
	translationPrefix,
}: AuditLogPageProps) {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();

	usePageTitle(t(`${translationPrefix}.title`));

	const [queryState, dispatchQuery] = useReducer(
		auditQueryReducer,
		searchParams,
		parseAuditQueryState,
	);
	const { actionFilter, cursorStack, entityTypeFilter, nextCursor, pageSize } =
		queryState;
	const lastWrittenSearchRef = useRef<string | null>(null);
	const [items, setItems] = useState<AuditLogEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const managedSearch = getManagedAuditSearchString(searchParams);
		if (managedSearch === lastWrittenSearchRef.current) {
			return;
		}

		dispatchQuery({
			type: "replace",
			value: parseAuditQueryState(searchParams),
		});
	}, [searchParams]);

	useEffect(() => {
		const nextManagedSearchParams = buildManagedAuditSearchParams({
			action: actionFilter,
			entityType: entityTypeFilter,
			pageSize,
		});
		const nextSearch = nextManagedSearchParams.toString();
		const currentSearch = getManagedAuditSearchString(searchParams);

		if (
			currentSearch !== lastWrittenSearchRef.current &&
			currentSearch !== nextSearch
		) {
			return;
		}

		lastWrittenSearchRef.current = nextSearch;
		if (nextSearch === currentSearch) {
			return;
		}

		setSearchParams(
			mergeManagedAuditSearchParams(searchParams, nextManagedSearchParams),
			{ replace: true },
		);
	}, [actionFilter, entityTypeFilter, pageSize, searchParams, setSearchParams]);

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			setError(null);
			const cursor = cursorStack.at(-1);
			const page = await list({
				action: actionFilter.trim() || undefined,
				after_created_at: cursor?.value,
				after_id: cursor?.id,
				entity_type:
					entityTypeFilter === "__all__" ? undefined : entityTypeFilter,
				limit: pageSize,
			});
			if (page.items.length === 0 && page.total > 0 && cursorStack.length > 0) {
				dispatchQuery({ type: "previous_page" });
				return;
			}
			setItems(page.items);
			setTotal(page.total);
			dispatchQuery({
				type: "set_next_cursor",
				value: page.next_cursor ?? null,
			});
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setLoading(false);
		}
	}, [actionFilter, cursorStack, entityTypeFilter, list, pageSize]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const activeFilterCount =
		(actionFilter.trim().length > 0 ? 1 : 0) +
		(entityTypeFilter !== "__all__" ? 1 : 0);
	const hasServerFilters = activeFilterCount > 0;
	const currentPage = cursorStack.length + 1;
	const totalPages = Math.max(cursorStack.length + (nextCursor ? 2 : 1), 1);
	const prevPageDisabled = cursorStack.length === 0;
	const nextPageDisabled = !nextCursor;
	const entityTypeOptions = [
		{
			label: t(`${translationPrefix}.filters.allTypes`),
			value: "__all__",
		},
		...AUDIT_ENTITY_TYPE_FILTER_VALUES.map((value) => ({
			label: formatAuditEntityType(t, value),
			value,
		})),
	] satisfies ReadonlyArray<{ label: string; value: AuditEntityTypeFilter }>;
	const pageSizeOptions = AUDIT_PAGE_SIZE_OPTIONS.map((size) => ({
		label: t("admin.pagination.pageSizeOption", { count: size }),
		value: String(size),
	}));

	const resetFilters = useCallback(() => {
		dispatchQuery({ type: "reset_filters" });
	}, []);

	const handlePageSizeChange = useCallback((value: string | null) => {
		const next = parsePageSizeOption(value, AUDIT_PAGE_SIZE_OPTIONS);
		if (next == null) {
			return;
		}
		dispatchQuery({ type: "set_page_size", value: next });
	}, []);

	const pagination = useMemo(
		() => (
			<AdminOffsetPagination
				currentPage={currentPage}
				nextDisabled={nextPageDisabled}
				onNext={() => dispatchQuery({ type: "next_page" })}
				onPageSizeChange={handlePageSizeChange}
				onPrevious={() => dispatchQuery({ type: "previous_page" })}
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
			total,
			totalPages,
		],
	);

	const toolbar = (
		<AuditFilterToolbar
			actionFilter={actionFilter}
			activeFilterCount={activeFilterCount}
			entityTypeFilter={entityTypeFilter}
			entityTypeOptions={entityTypeOptions}
			translationPrefix={translationPrefix}
			onActionFilterChange={(value) =>
				dispatchQuery({ type: "set_action_filter", value })
			}
			onEntityTypeFilterChange={(value) => {
				if (!value) return;
				dispatchQuery({
					type: "set_entity_type_filter",
					value: isAuditEntityType(value) ? value : "__all__",
				});
			}}
			onResetFilters={resetFilters}
		/>
	);

	const headerRow = useMemo(
		() => (
			<AuditTableHeader
				showActor={showActor}
				translationPrefix={translationPrefix}
			/>
		),
		[showActor, translationPrefix],
	);
	const emptyIcon = useMemo(
		() => <Icon name="Scroll" className="size-10" />,
		[],
	);
	const filteredEmptyAction = useMemo(
		() => (
			<Button type="button" variant="outline" onClick={resetFilters}>
				{t("admin.clearFilters")}
			</Button>
		),
		[resetFilters, t],
	);

	return (
		<AdminPageShell>
			<AdminPageHeader
				title={t(`${translationPrefix}.title`)}
				description={t(`${translationPrefix}.description`)}
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void reload()}
						disabled={loading}
					>
						<Icon
							name={loading ? "Spinner" : "ArrowsClockwise"}
							className={loading ? "size-4 animate-spin" : "size-4"}
						/>
						{t("common.refresh")}
					</Button>
				}
				toolbar={toolbar}
			/>

			<AuditLogTable
				emptyIcon={emptyIcon}
				error={error}
				filteredEmptyAction={filteredEmptyAction}
				hasServerFilters={hasServerFilters}
				headerRow={headerRow}
				items={items}
				loading={loading}
				pagination={pagination}
				reload={reload}
				showActor={showActor}
				t={t}
				translationPrefix={translationPrefix}
			/>
		</AdminPageShell>
	);
}

function AuditFilterToolbar({
	actionFilter,
	activeFilterCount,
	entityTypeFilter,
	entityTypeOptions,
	onActionFilterChange,
	onEntityTypeFilterChange,
	onResetFilters,
	translationPrefix,
}: {
	actionFilter: string;
	activeFilterCount: number;
	entityTypeFilter: AuditEntityTypeFilter;
	entityTypeOptions: ReadonlyArray<{
		label: string;
		value: AuditEntityTypeFilter;
	}>;
	onActionFilterChange: (value: string) => void;
	onEntityTypeFilterChange: (value: string | null) => void;
	onResetFilters: () => void;
	translationPrefix: AuditLogPageProps["translationPrefix"];
}) {
	const { t } = useTranslation();

	return (
		<AdminFilterToolbar
			activeFilterCount={activeFilterCount}
			inline
			onResetFilters={onResetFilters}
		>
			<div className="relative min-w-[14rem] flex-1 md:max-w-sm">
				<Icon
					name="MagnifyingGlass"
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={actionFilter}
					onChange={(event) => onActionFilterChange(event.target.value)}
					placeholder={t(`${translationPrefix}.filters.actionPlaceholder`)}
					className="pl-9"
				/>
			</div>
			<Select
				items={entityTypeOptions}
				value={entityTypeFilter}
				onValueChange={onEntityTypeFilterChange}
			>
				<SelectTrigger
					width="compact"
					aria-label={t(`${translationPrefix}.entity`)}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="start">
					{entityTypeOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</AdminFilterToolbar>
	);
}

function AuditTableHeader({
	showActor,
	translationPrefix,
}: {
	showActor: boolean;
	translationPrefix: AuditLogPageProps["translationPrefix"];
}) {
	const { t } = useTranslation();

	return (
		<AdminTableHeader>
			<AdminTableRow>
				<AdminTableHead className="w-[12rem]">
					{t(`${translationPrefix}.created`)}
				</AdminTableHead>
				{showActor ? (
					<AdminTableHead className="w-[11rem]">
						{t("admin.auditPage.user")}
					</AdminTableHead>
				) : null}
				<AdminTableHead className="w-[15rem]">
					{t(`${translationPrefix}.action`)}
				</AdminTableHead>
				<AdminTableHead className="w-[10rem]">
					{t(`${translationPrefix}.entity`)}
				</AdminTableHead>
				<AdminTableHead>{t("common.name")}</AdminTableHead>
				<AdminTableHead className="w-[10rem]">IP</AdminTableHead>
			</AdminTableRow>
		</AdminTableHeader>
	);
}

function AuditLogTable({
	emptyIcon,
	error,
	filteredEmptyAction,
	hasServerFilters,
	headerRow,
	items,
	loading,
	pagination,
	reload,
	showActor,
	t,
	translationPrefix,
}: {
	emptyIcon: ReactNode;
	error: string | null;
	filteredEmptyAction: ReactNode;
	hasServerFilters: boolean;
	headerRow: ReactNode;
	items: AuditLogEntry[];
	loading: boolean;
	pagination: ReactNode;
	reload: () => void;
	showActor: boolean;
	t: TFunction;
	translationPrefix: AuditLogPageProps["translationPrefix"];
}) {
	if (error && items.length === 0) {
		return (
			<AdminSurface padded={false}>
				<EmptyState
					icon={<Icon name="CircleAlert" className="size-5" />}
					title={t(`${translationPrefix}.loadErrorTitle`)}
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
		);
	}

	return (
		<AdminTableList
			columns={showActor ? 6 : 5}
			emptyDescription={t(`${translationPrefix}.emptyDescription`)}
			emptyIcon={emptyIcon}
			emptyTitle={t(`${translationPrefix}.emptyTitle`)}
			filtered={hasServerFilters}
			filteredEmptyAction={filteredEmptyAction}
			filteredEmptyDescription={t(
				`${translationPrefix}.filteredEmptyDescription`,
			)}
			filteredEmptyTitle={t(`${translationPrefix}.filteredEmptyTitle`)}
			headerRow={headerRow}
			items={items}
			loading={loading}
			pagination={pagination}
			renderRow={(item) => (
				<AuditLogTableRow
					key={item.id}
					item={item}
					showActor={showActor}
					t={t}
					translationPrefix={translationPrefix}
				/>
			)}
			rows={6}
		/>
	);
}

function AuditLogTableRow({
	item,
	showActor,
	t,
	translationPrefix,
}: {
	item: AuditLogEntry;
	showActor: boolean;
	t: TFunction;
	translationPrefix: AuditLogPageProps["translationPrefix"];
}) {
	const detail = formatAuditDetail(t, item);

	return (
		<AdminTableRow>
			<AdminTableCell>
				<div className="grid gap-1">
					<DateTimeText
						value={item.created_at}
						className="text-sm text-foreground"
					/>
					<span className={ADMIN_TABLE_MONO_TEXT_CLASS}>#{item.id}</span>
				</div>
			</AdminTableCell>
			{showActor ? (
				<AdminTableCell>
					<div className="grid gap-1">
						<span className="text-sm text-foreground">
							{item.user?.username || t("admin.auditPage.systemActor")}
						</span>
						<span className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
							{t("admin.auditPage.userId", { id: item.user_id })}
						</span>
					</div>
				</AdminTableCell>
			) : null}
			<AdminTableCell>
				<div className="grid gap-1">
					<Badge
						variant="outline"
						className={getAuditActionBadgeClass(item.action)}
					>
						{formatAuditSummary(t, item)}
					</Badge>
				</div>
			</AdminTableCell>
			<AdminTableCell>
				<div className="grid gap-1">
					<span className="text-sm text-foreground">
						{formatAuditTargetType(t, item)}
					</span>
					{item.entity_id != null ? (
						<span className={ADMIN_TABLE_MONO_TEXT_CLASS}>
							#{item.entity_id}
						</span>
					) : null}
				</div>
			</AdminTableCell>
			<AdminTableCell className="max-w-0">
				<div className="grid min-w-0 gap-1">
					<span
						className="truncate text-sm text-foreground"
						title={formatAuditTarget(t, item)}
					>
						{formatAuditTarget(t, item)}
					</span>
					{detail ? (
						<span className="truncate text-xs text-muted-foreground">
							{detail}
						</span>
					) : (
						<span className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
							{t(`${translationPrefix}.noDetail`)}
						</span>
					)}
				</div>
			</AdminTableCell>
			<AdminTableCell>
				<span className={ADMIN_TABLE_MONO_TEXT_CLASS}>
					{item.ip_address ?? "---"}
				</span>
			</AdminTableCell>
		</AdminTableRow>
	);
}

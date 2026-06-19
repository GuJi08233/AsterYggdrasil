import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminOffsetPagination } from "@/components/admin/AdminOffsetPagination";
import { TextureLibrarySectionNav } from "@/components/admin/TextureLibrarySectionNav";
import { AdminFilterToolbar } from "@/components/common/AdminFilterToolbar";
import {
	ADMIN_TABLE_MUTED_TEXT_CLASS,
	AdminTableCell,
	AdminTableHead,
	AdminTableHeader,
	AdminTableRow,
} from "@/components/common/AdminTable";
import { AdminTableList } from "@/components/common/AdminTableList";
import { DateTimeText } from "@/components/common/DateTimeText";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextureLibraryTextureAvatar } from "@/components/yggdrasil/TextureLibraryTextureAvatar";
import { handleApiError } from "@/hooks/useApiError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { parsePageSizeOption } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { adminTextureLibraryService } from "@/services/adminService";
import type {
	DateTimeIdCursor,
	MinecraftTextureReportReason,
	MinecraftTextureReportStatus,
	TextureReportInfo,
} from "@/types/api";

const REPORT_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_REPORT_PAGE_SIZE = 20;
const ALL_VALUE = "__all__";
const REPORT_REASONS = [
	"inappropriate",
	"offensive",
	"copyright",
	"misleading",
	"broken",
	"spam",
	"other",
] as const satisfies readonly MinecraftTextureReportReason[];
const REPORT_STATUSES = [
	"pending",
	"accepted",
	"rejected",
] as const satisfies readonly MinecraftTextureReportStatus[];

type ReportPageSize = (typeof REPORT_PAGE_SIZE_OPTIONS)[number];
type FilterValue<T extends string> = T | typeof ALL_VALUE;
type ReportAction = "accept" | "reject";

type ReportDialogState = {
	action: ReportAction;
	report: TextureReportInfo;
};

export default function AdminTextureLibraryReportsPage() {
	const { t } = useTranslation();
	const [pageSize, setPageSize] = useState<ReportPageSize>(
		DEFAULT_REPORT_PAGE_SIZE,
	);
	const [status, setStatus] =
		useState<FilterValue<MinecraftTextureReportStatus>>("pending");
	const [reason, setReason] =
		useState<FilterValue<MinecraftTextureReportReason>>(ALL_VALUE);
	const [dialog, setDialog] = useState<ReportDialogState | null>(null);
	const [adminNote, setAdminNote] = useState("");
	const [submittingReportId, setSubmittingReportId] = useState<number | null>(
		null,
	);
	const [cursorStack, setCursorStack] = useState<DateTimeIdCursor[]>([]);
	const [nextCursor, setNextCursor] = useState<DateTimeIdCursor | null>(null);
	const [reports, setReports] = useState<TextureReportInfo[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);

	usePageTitle(t("admin.textureLibraryReportsPage.title"));

	const query = useMemo(
		() => ({
			limit: pageSize,
			after_created_at: cursorStack.at(-1)?.value,
			after_id: cursorStack.at(-1)?.id,
			status: status === ALL_VALUE ? undefined : status,
			reason: reason === ALL_VALUE ? undefined : reason,
		}),
		[cursorStack, pageSize, reason, status],
	);

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			const page = await adminTextureLibraryService.listReports(query);
			setReports(page.items);
			setTotal(page.total);
			setNextCursor(page.next_cursor ?? null);
		} catch (error) {
			handleApiError(error);
		} finally {
			setLoading(false);
		}
	}, [query]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const resetCursor = useCallback(() => {
		setCursorStack((current) => (current.length > 0 ? [] : current));
		setNextCursor((current) => (current ? null : current));
	}, []);

	const activeFilterCount =
		(status !== "pending" ? 1 : 0) + (reason !== ALL_VALUE ? 1 : 0);
	const pagination = useMemo(
		() => (
			<AdminOffsetPagination
				total={total}
				currentPage={cursorStack.length + 1}
				totalPages={Math.max(cursorStack.length + (nextCursor ? 2 : 1), 1)}
				pageSize={String(pageSize)}
				pageSizeOptions={REPORT_PAGE_SIZE_OPTIONS.map((size) => ({
					label: t("admin.pagination.pageSizeOption", { count: size }),
					value: String(size),
				}))}
				prevDisabled={cursorStack.length === 0}
				nextDisabled={nextCursor === null}
				onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
				onNext={() => {
					if (!nextCursor) return;
					setCursorStack((current) => [...current, nextCursor]);
				}}
				onPageSizeChange={(value) => {
					const next = parsePageSizeOption(value, REPORT_PAGE_SIZE_OPTIONS);
					if (next == null) return;
					setPageSize(next);
					resetCursor();
				}}
			/>
		),
		[cursorStack.length, nextCursor, pageSize, resetCursor, t, total],
	);

	const openDialog = useCallback(
		(action: ReportAction, report: TextureReportInfo) => {
			setDialog({ action, report });
			setAdminNote(report.admin_note ?? "");
		},
		[],
	);

	function closeDialog() {
		if (submittingReportId !== null) return;
		setDialog(null);
		setAdminNote("");
	}

	async function submitReportAction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!dialog) return;
		setSubmittingReportId(dialog.report.id);
		try {
			const updated =
				dialog.action === "accept"
					? await adminTextureLibraryService.acceptReport(dialog.report.id, {
							admin_note: adminNote.trim() || null,
						})
					: await adminTextureLibraryService.rejectReport(dialog.report.id, {
							admin_note: adminNote.trim() || null,
						});
			setReports((current) =>
				current.map((report) => (report.id === updated.id ? updated : report)),
			);
			toast.success(
				t(`admin.textureLibraryReportsPage.${dialog.action}Success`),
			);
			setDialog(null);
			setAdminNote("");
			await reload();
		} catch (error) {
			handleApiError(error);
		} finally {
			setSubmittingReportId(null);
		}
	}

	return (
		<AdminPageShell>
			<AdminPageHeader
				title={t("admin.textureLibraryReportsPage.title")}
				description={t("admin.textureLibraryReportsPage.description")}
				actions={
					<>
						<TextureLibrarySectionNav active="reports" />
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={loading}
							onClick={() => void reload()}
						>
							<Icon
								name={loading ? "Spinner" : "RefreshCw"}
								className={cn("size-4", loading && "animate-spin")}
							/>
							{t("common.refresh")}
						</Button>
					</>
				}
			/>

			<AdminTableList
				columns={7}
				emptyIcon={<Icon name="Flag" className="size-5" />}
				emptyTitle={t("admin.textureLibraryReportsPage.emptyTitle")}
				emptyDescription={t("admin.textureLibraryReportsPage.emptyDescription")}
				filtered={activeFilterCount > 0}
				filteredEmptyTitle={t(
					"admin.textureLibraryReportsPage.filteredEmptyTitle",
				)}
				filteredEmptyDescription={t(
					"admin.textureLibraryReportsPage.filteredEmptyDescription",
				)}
				headerRow={<ReportTableHeader />}
				items={reports}
				loading={loading}
				pagination={pagination}
				renderRow={(report) => (
					<ReportTableRow
						key={report.id}
						report={report}
						loading={submittingReportId === report.id}
						onAccept={() => openDialog("accept", report)}
						onReject={() => openDialog("reject", report)}
					/>
				)}
				rows={8}
				toolbar={
					<AdminFilterToolbar
						activeFilterCount={activeFilterCount}
						inline
						onResetFilters={() => {
							setStatus("pending");
							setReason(ALL_VALUE);
							resetCursor();
						}}
					>
						<ReportSelect
							ariaLabel={t("admin.textureLibraryReportsPage.statusLabel")}
							value={status}
							options={[
								{
									label: t("admin.textureLibraryReportsPage.statusAll"),
									value: ALL_VALUE,
								},
								...REPORT_STATUSES.map((status) => ({
									label: t(`admin.textureLibraryReportsPage.status.${status}`),
									value: status,
								})),
							]}
							onChange={(value) => {
								setStatus(value as FilterValue<MinecraftTextureReportStatus>);
								resetCursor();
							}}
						/>
						<ReportSelect
							ariaLabel={t("admin.textureLibraryReportsPage.reasonLabel")}
							value={reason}
							options={[
								{
									label: t("admin.textureLibraryReportsPage.reasonAll"),
									value: ALL_VALUE,
								},
								...REPORT_REASONS.map((reason) => ({
									label: t(`admin.textureLibraryReportsPage.reason.${reason}`),
									value: reason,
								})),
							]}
							onChange={(value) => {
								setReason(value as FilterValue<MinecraftTextureReportReason>);
								resetCursor();
							}}
						/>
					</AdminFilterToolbar>
				}
			/>

			<ReportActionDialog
				open={dialog !== null}
				dialog={dialog}
				adminNote={adminNote}
				submitting={submittingReportId !== null}
				onClose={closeDialog}
				onNoteChange={setAdminNote}
				onSubmit={submitReportAction}
			/>
		</AdminPageShell>
	);
}

function ReportTableHeader() {
	const { t } = useTranslation();
	return (
		<AdminTableHeader>
			<AdminTableRow>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.texture")}
				</AdminTableHead>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.reporter")}
				</AdminTableHead>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.reasonLabel")}
				</AdminTableHead>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.statusLabel")}
				</AdminTableHead>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.createdAt")}
				</AdminTableHead>
				<AdminTableHead>
					{t("admin.textureLibraryReportsPage.handledAt")}
				</AdminTableHead>
				<AdminTableHead className="text-right">
					{t("admin.textureLibraryReportsPage.actions")}
				</AdminTableHead>
			</AdminTableRow>
		</AdminTableHeader>
	);
}

function ReportTableRow({
	loading,
	onAccept,
	onReject,
	report,
}: {
	loading: boolean;
	onAccept: () => void;
	onReject: () => void;
	report: TextureReportInfo;
}) {
	const { t } = useTranslation();
	const pending = report.status === "pending";
	return (
		<AdminTableRow>
			<AdminTableCell className="min-w-60">
				{report.texture ? (
					<div className="flex min-w-0 items-center gap-3">
						<TextureLibraryTextureAvatar
							texture={report.texture}
							className="size-10"
							testId={`admin-report-texture-preview-${report.id}`}
							imageTestId={`admin-report-texture-preview-image-${report.id}`}
						/>
						<div className="min-w-0">
							<div className="truncate font-medium">{report.texture.name}</div>
							<div className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
								#{report.texture.id} ·{" "}
								{t(`wardrobe.type.${report.texture.texture_type}`)}
							</div>
						</div>
					</div>
				) : (
					<div>
						<div className="font-medium">
							{t("admin.textureLibraryReportsPage.missingTexture")}
						</div>
						<div className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
							#{report.texture_id}
						</div>
					</div>
				)}
			</AdminTableCell>
			<AdminTableCell>
				<div className="min-w-0">
					<div className="truncate">
						{report.reporter?.name ??
							t("admin.textureLibraryReportsPage.unknownUser")}
					</div>
					<div className={ADMIN_TABLE_MUTED_TEXT_CLASS}>
						{report.reporter?.public_uuid ?? "-"}
					</div>
				</div>
			</AdminTableCell>
			<AdminTableCell>
				<div className="grid gap-1">
					<Badge variant="outline" className="rounded-md">
						{t(`admin.textureLibraryReportsPage.reason.${report.reason}`)}
					</Badge>
					{report.message ? (
						<div className="max-w-64 truncate text-xs text-muted-foreground">
							{report.message}
						</div>
					) : null}
				</div>
			</AdminTableCell>
			<AdminTableCell>
				<ReportStatusBadge status={report.status} />
			</AdminTableCell>
			<AdminTableCell>
				<DateTimeText value={report.created_at} />
			</AdminTableCell>
			<AdminTableCell>
				<DateTimeText value={report.handled_at} />
			</AdminTableCell>
			<AdminTableCell className="text-right">
				<div className="flex justify-end gap-1.5">
					<Button
						type="button"
						size="sm"
						variant="destructive"
						disabled={!pending || loading}
						onClick={onAccept}
					>
						{t("admin.textureLibraryReportsPage.acceptAction")}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={!pending || loading}
						onClick={onReject}
					>
						{t("admin.textureLibraryReportsPage.rejectAction")}
					</Button>
				</div>
			</AdminTableCell>
		</AdminTableRow>
	);
}

function ReportStatusBadge({
	status,
}: {
	status: MinecraftTextureReportStatus;
}) {
	const { t } = useTranslation();
	const variant = status === "accepted" ? "destructive" : "outline";
	return (
		<Badge variant={variant} className="rounded-md">
			{t(`admin.textureLibraryReportsPage.status.${status}`)}
		</Badge>
	);
}

function ReportActionDialog({
	adminNote,
	dialog,
	onClose,
	onNoteChange,
	onSubmit,
	open,
	submitting,
}: {
	adminNote: string;
	dialog: ReportDialogState | null;
	onClose: () => void;
	onNoteChange: (value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	submitting: boolean;
}) {
	const { t } = useTranslation();
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent keepMounted className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{dialog
							? t(`admin.textureLibraryReportsPage.${dialog.action}Title`)
							: t("admin.textureLibraryReportsPage.reviewTitle")}
					</DialogTitle>
					<DialogDescription>
						{dialog?.action === "accept"
							? t("admin.textureLibraryReportsPage.acceptDescription")
							: t("admin.textureLibraryReportsPage.rejectDescription")}
					</DialogDescription>
				</DialogHeader>

				{dialog ? (
					<form
						id="texture-report-action-form"
						className="space-y-3"
						onSubmit={onSubmit}
					>
						<div className="rounded-lg border border-border/70 bg-muted/25 p-3">
							<div className="text-sm font-medium">
								{dialog.report.texture?.name ??
									t("admin.textureLibraryReportsPage.missingTexture")}
							</div>
							<div className="mt-1 text-xs text-muted-foreground">
								{t(
									`admin.textureLibraryReportsPage.reason.${dialog.report.reason}`,
								)}
							</div>
							{dialog.report.message ? (
								<p className="mt-2 text-sm leading-6">
									{dialog.report.message}
								</p>
							) : null}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="texture-report-admin-note">
								{t("admin.textureLibraryReportsPage.adminNote")}
							</Label>
							<Textarea
								id="texture-report-admin-note"
								value={adminNote}
								maxLength={512}
								disabled={submitting}
								placeholder={t(
									"admin.textureLibraryReportsPage.adminNotePlaceholder",
								)}
								onChange={(event) => onNoteChange(event.currentTarget.value)}
							/>
						</div>
					</form>
				) : null}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={submitting}
						onClick={onClose}
					>
						{t("common.cancel")}
					</Button>
					<Button
						type="submit"
						form="texture-report-action-form"
						variant={dialog?.action === "accept" ? "destructive" : "default"}
						disabled={!dialog || submitting}
					>
						{dialog
							? t(`admin.textureLibraryReportsPage.${dialog.action}Action`)
							: t("common.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ReportSelect({
	ariaLabel,
	onChange,
	options,
	value,
}: {
	ariaLabel: string;
	onChange: (value: string) => void;
	options: { label: string; value: string }[];
	value: string;
}) {
	return (
		<Select
			value={value}
			onValueChange={(nextValue) => {
				if (nextValue !== null) onChange(nextValue);
			}}
		>
			<SelectTrigger className="w-44" aria-label={ariaLabel}>
				<span data-slot="select-value">
					{options.find((option) => option.value === value)?.label ?? value}
				</span>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

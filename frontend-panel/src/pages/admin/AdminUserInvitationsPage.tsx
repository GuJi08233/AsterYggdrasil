import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminOffsetPagination } from "@/components/admin/AdminOffsetPagination";
import { InviteUserDialog } from "@/components/admin/admin-users-page/InviteUserDialog";
import {
	UserInvitationsTableHeader,
	UserInvitationsTableRow,
} from "@/components/admin/admin-users-page/UserInvitationsTable";
import { UsersSectionNav } from "@/components/admin/UsersSectionNav";
import { AdminTableList } from "@/components/common/AdminTableList";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { handleApiError } from "@/hooks/useApiError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { parsePageSizeOption } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { adminUserService } from "@/services/adminService";
import type {
	AdminUserInvitationInfo,
	CreateUserInvitationRequest,
	DateTimeIdCursor,
} from "@/types/api";

const INVITATION_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_INVITATION_PAGE_SIZE = 20;

type InvitationPageSize = (typeof INVITATION_PAGE_SIZE_OPTIONS)[number];

type InviteState = {
	createdInvitation: AdminUserInvitationInfo | null;
	emailError: string | null;
	form: CreateUserInvitationRequest;
	inviteDialogOpen: boolean;
	inviting: boolean;
};

type InviteAction =
	| { type: "closeDialog" }
	| { type: "created"; invitation: AdminUserInvitationInfo }
	| { type: "email"; value: string }
	| { type: "emailError"; value: string | null }
	| { type: "openDialog"; value: boolean }
	| { type: "inviting"; value: boolean };

function createInviteForm(): CreateUserInvitationRequest {
	return { email: "" };
}

function inviteReducer(state: InviteState, action: InviteAction): InviteState {
	switch (action.type) {
		case "closeDialog":
			return state.inviting
				? state
				: {
						createdInvitation: null,
						emailError: null,
						form: createInviteForm(),
						inviteDialogOpen: false,
						inviting: false,
					};
		case "created":
			return {
				...state,
				createdInvitation: action.invitation,
				form: { email: action.invitation.email },
			};
		case "email":
			return {
				...state,
				createdInvitation: null,
				emailError: null,
				form: { email: action.value },
			};
		case "emailError":
			return { ...state, emailError: action.value };
		case "openDialog":
			return { ...state, inviteDialogOpen: action.value };
		case "inviting":
			return { ...state, inviting: action.value };
	}
}

function initInviteState(): InviteState {
	return {
		createdInvitation: null,
		emailError: null,
		form: createInviteForm(),
		inviteDialogOpen: false,
		inviting: false,
	};
}

function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AdminUserInvitationsPage() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();
	const [inviteState, dispatchInvite] = useReducer(
		inviteReducer,
		undefined,
		initInviteState,
	);
	const [revokingInvitation, setRevokingInvitation] =
		useState<AdminUserInvitationInfo | null>(null);
	const [revokingInvitationId, setRevokingInvitationId] = useState<
		number | null
	>(null);
	const [cursorStack, setCursorStack] = useState<DateTimeIdCursor[]>([]);
	const [nextCursor, setNextCursor] = useState<DateTimeIdCursor | null>(null);
	const [invitations, setInvitations] = useState<AdminUserInvitationInfo[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);

	usePageTitle(t("admin.users.invitationsTitle"));

	const pageSize =
		parsePageSizeOption(
			searchParams.get("pageSize"),
			INVITATION_PAGE_SIZE_OPTIONS,
		) ?? DEFAULT_INVITATION_PAGE_SIZE;

	const loadPage = useCallback(
		async (stack: DateTimeIdCursor[]) => {
			setLoading(true);
			try {
				const cursor = stack.at(-1);
				const page = await adminUserService.listInvitations({
					limit: pageSize,
					after_created_at: cursor?.value,
					after_id: cursor?.id,
				});
				if (page.items.length === 0 && page.total > 0 && stack.length > 0) {
					setCursorStack((current) => current.slice(0, -1));
					setNextCursor(null);
					return;
				}
				setInvitations(page.items);
				setTotal(page.total);
				setNextCursor(page.next_cursor ?? null);
			} catch (error) {
				handleApiError(error);
			} finally {
				setLoading(false);
			}
		},
		[pageSize],
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

	const setPagination = useCallback(
		(nextPageSize: InvitationPageSize) => {
			const next = new URLSearchParams();
			if (nextPageSize !== DEFAULT_INVITATION_PAGE_SIZE) {
				next.set("pageSize", String(nextPageSize));
			}
			setCursorStack([]);
			setNextCursor(null);
			setSearchParams(next);
		},
		[setSearchParams],
	);

	const totalPages = Math.max(cursorStack.length + (nextCursor ? 2 : 1), 1);
	const currentPage = cursorStack.length + 1;
	const pageSizeOptions = INVITATION_PAGE_SIZE_OPTIONS.map((size) => ({
		label: t("admin.pagination.pageSizeOption", { count: size }),
		value: String(size),
	}));
	const pagination = useMemo(
		() => (
			<AdminOffsetPagination
				total={total}
				currentPage={currentPage}
				totalPages={totalPages}
				pageSize={String(pageSize)}
				pageSizeOptions={pageSizeOptions}
				prevDisabled={cursorStack.length === 0}
				nextDisabled={!nextCursor}
				onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
				onNext={() => {
					if (!nextCursor) return;
					setCursorStack((current) => [...current, nextCursor]);
				}}
				onPageSizeChange={(value) => {
					const next = parsePageSizeOption(value, INVITATION_PAGE_SIZE_OPTIONS);
					if (next == null) return;
					setPagination(next);
				}}
			/>
		),
		[
			currentPage,
			cursorStack.length,
			nextCursor,
			pageSize,
			pageSizeOptions,
			setPagination,
			total,
			totalPages,
		],
	);
	const invitationsEmptyIcon = useMemo(
		() => <Icon name="EnvelopeSimple" className="size-5" />,
		[],
	);
	const invitationsEmptyAction = useMemo(
		() => (
			<Button
				type="button"
				onClick={() => dispatchInvite({ type: "openDialog", value: true })}
			>
				<Icon name="EnvelopeSimple" className="mr-2 size-4" />
				{t("admin.users.inviteUser")}
			</Button>
		),
		[t],
	);
	const invitationsHeaderRow = useMemo(
		() => <UserInvitationsTableHeader />,
		[],
	);

	const copyInvitationLink = useCallback(
		async (value: string) => {
			if (!value) return;
			try {
				await navigator.clipboard.writeText(value);
				toast.success(t("common.copied"));
			} catch (error) {
				handleApiError(error);
			}
		},
		[t],
	);

	async function createInvitation(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const email = inviteState.form.email.trim();
		if (!isValidEmail(email)) {
			dispatchInvite({
				type: "emailError",
				value: t("admin.users.inviteEmailInvalid"),
			});
			return;
		}
		try {
			dispatchInvite({ type: "inviting", value: true });
			const invitation = await adminUserService.createInvitation({ email });
			dispatchInvite({ type: "created", invitation });
			toast.success(t("admin.users.invitationCreated"));
			await reloadFirstPage();
		} catch (error) {
			handleApiError(error);
		} finally {
			dispatchInvite({ type: "inviting", value: false });
		}
	}

	async function revokeInvitation() {
		if (!revokingInvitation) return;
		try {
			setRevokingInvitationId(revokingInvitation.id);
			const updated = await adminUserService.revokeInvitation(
				revokingInvitation.id,
			);
			setInvitations((current) =>
				current.map((item) => (item.id === updated.id ? updated : item)),
			);
			toast.success(t("admin.users.invitationRevoked"));
			setRevokingInvitation(null);
		} catch (error) {
			handleApiError(error);
		} finally {
			setRevokingInvitationId(null);
		}
	}

	return (
		<AdminPageShell>
			<AdminPageHeader
				title={t("admin.users.invitationsTitle")}
				description={t("admin.users.invitationsDescription")}
				actions={
					<>
						<UsersSectionNav active="invitations" />
						<Button
							type="button"
							size="sm"
							onClick={() =>
								dispatchInvite({ type: "openDialog", value: true })
							}
						>
							<Icon name="EnvelopeSimple" className="mr-2 size-4" />
							{t("admin.users.inviteUser")}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={loading}
							onClick={() => void reload()}
						>
							<Icon
								name={loading ? "Spinner" : "ArrowsClockwise"}
								className={cn("mr-2 size-4", loading && "animate-spin")}
							/>
							{t("common.refresh")}
						</Button>
					</>
				}
			/>
			<AdminTableList
				loading={loading}
				items={invitations}
				columns={6}
				rows={6}
				emptyIcon={invitationsEmptyIcon}
				emptyTitle={t("admin.users.noInvitationsTitle")}
				emptyDescription={t("admin.users.noInvitationsDescription")}
				emptyAction={invitationsEmptyAction}
				headerRow={invitationsHeaderRow}
				pagination={pagination}
				renderRow={(invitation) => (
					<UserInvitationsTableRow
						key={invitation.id}
						invitation={invitation}
						revokingInvitationId={revokingInvitationId}
						onRevokeInvitation={setRevokingInvitation}
					/>
				)}
			/>
			<InviteUserDialog
				open={inviteState.inviteDialogOpen}
				form={inviteState.form}
				error={inviteState.emailError}
				inviting={inviteState.inviting}
				createdInvitation={inviteState.createdInvitation}
				onFieldChange={(value) => dispatchInvite({ type: "email", value })}
				onCopyLink={(value) => void copyInvitationLink(value)}
				onSubmit={(event) => void createInvitation(event)}
				onOpenChange={(open) => {
					if (open) {
						dispatchInvite({ type: "openDialog", value: true });
					} else {
						dispatchInvite({ type: "closeDialog" });
					}
				}}
			/>
			<ConfirmDialog
				open={Boolean(revokingInvitation)}
				onOpenChange={(open) => {
					if (!open) setRevokingInvitation(null);
				}}
				title={t("admin.users.revokeInvitation")}
				description={t("admin.users.confirmRevokeInvitation", {
					email: revokingInvitation?.email ?? "",
				})}
				cancelLabel={t("common.cancel")}
				confirmLabel={t("admin.users.revokeInvitation")}
				loading={revokingInvitationId != null}
				variant="destructive"
				onConfirm={() => void revokeInvitation()}
			/>
		</AdminPageShell>
	);
}

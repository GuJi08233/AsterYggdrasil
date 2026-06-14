import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
	createPasskeyCredential,
	isWebAuthnSupported,
	WebAuthnCancelledError,
	WebAuthnUnsupportedError,
} from "@/lib/webauthn";
import { authService, type PasskeyInfo } from "@/services/authService";
import { formatUnknownError } from "@/services/http";

function formatLastUsed(passkey: PasskeyInfo, fallback: string) {
	return passkey.last_used_at ?? fallback;
}

type PasskeysState = {
	busyIds: Set<number>;
	creating: boolean;
	editingId: number | null;
	editingName: string;
	loading: boolean;
	name: string;
	passkeys: PasskeyInfo[];
};

type PasskeysAction =
	| { type: "set_loading"; value: boolean }
	| { type: "set_passkeys"; value: PasskeyInfo[] }
	| { type: "set_creating"; value: boolean }
	| { type: "set_name"; value: string }
	| { type: "created"; value: PasskeyInfo }
	| { type: "start_edit"; id: number; name: string }
	| { type: "cancel_edit" }
	| { type: "set_editing_name"; value: string }
	| { type: "renamed"; value: PasskeyInfo }
	| { type: "deleted"; id: number }
	| { type: "set_busy"; id: number; value: boolean };

const initialPasskeysState: PasskeysState = {
	busyIds: new Set(),
	creating: false,
	editingId: null,
	editingName: "",
	loading: false,
	name: "",
	passkeys: [],
};

function passkeysReducer(
	state: PasskeysState,
	action: PasskeysAction,
): PasskeysState {
	switch (action.type) {
		case "set_loading":
			return { ...state, loading: action.value };
		case "set_passkeys":
			return { ...state, passkeys: action.value };
		case "set_creating":
			return { ...state, creating: action.value };
		case "set_name":
			return { ...state, name: action.value };
		case "created":
			return {
				...state,
				name: "",
				passkeys: [action.value, ...state.passkeys],
			};
		case "start_edit":
			return {
				...state,
				editingId: action.id,
				editingName: action.name,
			};
		case "cancel_edit":
			return { ...state, editingId: null, editingName: "" };
		case "set_editing_name":
			return { ...state, editingName: action.value };
		case "renamed":
			return {
				...state,
				editingId: null,
				editingName: "",
				passkeys: state.passkeys.map((passkey) =>
					passkey.id === action.value.id ? action.value : passkey,
				),
			};
		case "deleted":
			return {
				...state,
				passkeys: state.passkeys.filter((passkey) => passkey.id !== action.id),
			};
		case "set_busy": {
			const busyIds = new Set(state.busyIds);
			if (action.value) busyIds.add(action.id);
			else busyIds.delete(action.id);
			return { ...state, busyIds };
		}
	}
}

export function SecurityPasskeysSection() {
	const { t } = useTranslation();
	const [state, dispatch] = useReducer(passkeysReducer, initialPasskeysState);
	const supported = useMemo(() => isWebAuthnSupported(), []);

	const reload = useCallback(async (options?: { force?: boolean }) => {
		dispatch({ type: "set_loading", value: true });
		try {
			dispatch({
				type: "set_passkeys",
				value: await authService.listPasskeys(options),
			});
		} catch (error) {
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "set_loading", value: false });
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	async function createPasskey() {
		if (!supported) {
			toast.error(t("personalSettings.passkeysUnsupported"));
			return;
		}
		dispatch({ type: "set_creating", value: true });
		try {
			const start = await authService.startPasskeyRegistration({
				name: state.name.trim() || null,
			});
			const credential = await createPasskeyCredential(start.public_key);
			const created = await authService.finishPasskeyRegistration(
				start.flow_id,
				credential,
				state.name.trim() || null,
			);
			dispatch({ type: "created", value: created });
			toast.success(t("personalSettings.passkeysCreated"));
		} catch (error) {
			if (error instanceof WebAuthnUnsupportedError) {
				toast.error(t("personalSettings.passkeysUnsupported"));
				return;
			}
			if (error instanceof WebAuthnCancelledError) {
				toast.error(t("personalSettings.passkeysCancelled"));
				return;
			}
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "set_creating", value: false });
		}
	}

	async function saveRename(id: number) {
		const finalName = state.editingName.trim();
		if (!finalName) return;
		dispatch({ type: "set_busy", id, value: true });
		try {
			const updated = await authService.renamePasskey(id, { name: finalName });
			dispatch({ type: "renamed", value: updated });
			toast.success(t("personalSettings.passkeysRenamed"));
		} catch (error) {
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "set_busy", id, value: false });
		}
	}

	async function deletePasskey(id: number) {
		dispatch({ type: "set_busy", id, value: true });
		try {
			await authService.deletePasskey(id);
			dispatch({ type: "deleted", id });
			toast.success(t("personalSettings.passkeysDeleted"));
		} catch (error) {
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "set_busy", id, value: false });
		}
	}

	return (
		<section className="rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">
						{t("personalSettings.passkeysTitle")}
					</h2>
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						{t("personalSettings.passkeysDescription")}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={() => void reload({ force: true })}
				>
					<Icon name="ArrowClockwise" className="mr-2 size-4" />
					{t("common.refresh")}
				</Button>
			</div>

			<div className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-background/50 p-4 dark:border-white/10">
				<div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
					<Input
						value={state.name}
						disabled={state.creating}
						maxLength={128}
						placeholder={t("personalSettings.passkeysNamePlaceholder")}
						onChange={(event) =>
							dispatch({ type: "set_name", value: event.currentTarget.value })
						}
					/>
					<Button
						type="button"
						disabled={state.creating || !supported}
						onClick={() => void createPasskey()}
					>
						<Icon
							name={state.creating ? "Spinner" : "Plus"}
							className="mr-2 size-4"
						/>
						{t("personalSettings.passkeysAdd")}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					{supported
						? t("personalSettings.passkeysHint")
						: t("personalSettings.passkeysUnsupported")}
				</p>
			</div>

			<div className="mt-4 space-y-2">
				{state.loading ? (
					<div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
						{t("common.loading")}
					</div>
				) : state.passkeys.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
						{t("personalSettings.passkeysEmpty")}
					</div>
				) : (
					state.passkeys.map((passkey) => {
						const busy = state.busyIds.has(passkey.id);
						const editing = state.editingId === passkey.id;
						return (
							<div
								key={passkey.id}
								className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-4 dark:border-white/10"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="min-w-0">
										{editing ? (
											<Input
												value={state.editingName}
												disabled={busy}
												maxLength={128}
												onChange={(event) =>
													dispatch({
														type: "set_editing_name",
														value: event.currentTarget.value,
													})
												}
											/>
										) : (
											<div className="truncate text-sm font-semibold">
												{passkey.name}
											</div>
										)}
										<div className="mt-1 text-xs text-muted-foreground">
											{t("personalSettings.passkeysLastUsed")}:{" "}
											{formatLastUsed(
												passkey,
												t("personalSettings.passkeysNeverUsed"),
											)}
										</div>
									</div>
									<div className="flex flex-wrap gap-2">
										{editing ? (
											<>
												<Button
													type="button"
													size="sm"
													disabled={busy || !state.editingName.trim()}
													onClick={() => void saveRename(passkey.id)}
												>
													<Icon name="Check" className="mr-2 size-4" />
													{t("common.save")}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={busy}
													onClick={() => dispatch({ type: "cancel_edit" })}
												>
													{t("common.cancel")}
												</Button>
											</>
										) : (
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={busy}
												onClick={() =>
													dispatch({
														type: "start_edit",
														id: passkey.id,
														name: passkey.name,
													})
												}
											>
												<Icon name="PencilSimple" className="mr-2 size-4" />
												{t("personalSettings.passkeysRename")}
											</Button>
										)}
										<Button
											type="button"
											size="sm"
											variant="destructive"
											disabled={busy}
											onClick={() => void deletePasskey(passkey.id)}
										>
											<Icon name="Trash" className="mr-2 size-4" />
											{t("personalSettings.passkeysDelete")}
										</Button>
									</div>
								</div>
								<div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
									<div>
										{t("personalSettings.passkeysCreatedAt")}:{" "}
										{passkey.created_at}
									</div>
									<div>
										{t("personalSettings.passkeysUpdated")}:{" "}
										{passkey.updated_at}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</section>
	);
}

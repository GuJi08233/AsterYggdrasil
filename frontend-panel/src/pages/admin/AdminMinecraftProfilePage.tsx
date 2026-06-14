import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProfileSummaryPanel } from "@/components/admin/admin-minecraft-profile-page/ProfileSummaryPanel";
import { ProfileTextureList } from "@/components/admin/admin-minecraft-profile-page/ProfileTextureList";
import type {
	AdminMinecraftProfileInfo,
	MinecraftTextureMetadata,
} from "@/components/admin/admin-minecraft-profile-page/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MinecraftPreview } from "@/components/yggdrasil/MinecraftPreview";
import { handleApiError } from "@/hooks/useApiError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { adminMinecraftProfileService } from "@/services/adminService";

function parseUuid(value: string | undefined) {
	if (!value) return null;
	return value.trim() || null;
}

type PageState = {
	profile: AdminMinecraftProfileInfo | null;
	textures: MinecraftTextureMetadata[];
	loading: boolean;
	deleteDialogOpen: boolean;
	textureToDelete: MinecraftTextureMetadata | null;
	deletingProfile: boolean;
	deletingTexture: boolean;
};

type PageAction =
	| { type: "loadStart" }
	| {
			type: "loadSuccess";
			profile: AdminMinecraftProfileInfo;
			textures: MinecraftTextureMetadata[];
	  }
	| { type: "loadError" }
	| { type: "setLoading"; value: boolean }
	| { type: "deleteDialogOpen"; value: boolean }
	| { type: "textureToDelete"; value: MinecraftTextureMetadata | null }
	| { type: "deletingProfile"; value: boolean }
	| { type: "deletingTexture"; value: boolean };

const initialPageState: PageState = {
	profile: null,
	textures: [],
	loading: true,
	deleteDialogOpen: false,
	textureToDelete: null,
	deletingProfile: false,
	deletingTexture: false,
};

function pageReducer(state: PageState, action: PageAction): PageState {
	switch (action.type) {
		case "loadStart":
			return { ...state, loading: true };
		case "loadSuccess":
			return {
				...state,
				profile: action.profile,
				textures: action.textures,
				loading: false,
			};
		case "loadError":
			return { ...state, profile: null, textures: [], loading: false };
		case "setLoading":
			return { ...state, loading: action.value };
		case "deleteDialogOpen":
			return { ...state, deleteDialogOpen: action.value };
		case "textureToDelete":
			return { ...state, textureToDelete: action.value };
		case "deletingProfile":
			return { ...state, deletingProfile: action.value };
		case "deletingTexture":
			return { ...state, deletingTexture: action.value };
	}
}

export default function AdminMinecraftProfilePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const params = useParams();
	const uuid = parseUuid(params.uuid);
	const [state, dispatch] = useReducer(pageReducer, initialPageState);
	const {
		deleteDialogOpen,
		deletingProfile,
		deletingTexture,
		loading,
		profile,
		textureToDelete,
		textures,
	} = state;

	usePageTitle(profile?.name ?? t("admin.minecraftProfilePage.title"));

	const load = useCallback(async () => {
		if (!uuid) {
			dispatch({ type: "setLoading", value: false });
			return;
		}
		try {
			dispatch({ type: "loadStart" });
			const [nextProfile, nextTextures] = await Promise.all([
				adminMinecraftProfileService.get(uuid),
				adminMinecraftProfileService.listTextures(uuid),
			]);
			dispatch({
				type: "loadSuccess",
				profile: nextProfile as AdminMinecraftProfileInfo,
				textures: nextTextures as MinecraftTextureMetadata[],
			});
		} catch (error) {
			handleApiError(error);
			dispatch({ type: "loadError" });
		}
	}, [uuid]);

	useEffect(() => {
		void load();
	}, [load]);

	const skinTexture =
		textures.find((texture) => texture.texture_type === "skin") ?? null;
	const capeTexture =
		textures.find((texture) => texture.texture_type === "cape") ?? null;

	const handleDeleteProfile = async () => {
		if (!uuid) return;
		dispatch({ type: "deletingProfile", value: true });
		try {
			await adminMinecraftProfileService.delete(uuid);
			toast.success(t("admin.minecraftProfilePage.deleted"));
			navigate("/dashboard/admin/users");
		} catch (error) {
			handleApiError(error);
		} finally {
			dispatch({ type: "deletingProfile", value: false });
			dispatch({ type: "deleteDialogOpen", value: false });
		}
	};

	const handleDeleteTexture = async () => {
		if (!uuid || !textureToDelete) return;
		dispatch({ type: "deletingTexture", value: true });
		try {
			await adminMinecraftProfileService.deleteTexture(
				uuid,
				textureToDelete.texture_type,
			);
			toast.success(
				t("admin.minecraftProfilePage.textureDeleted", {
					textureType: textureToDelete.texture_type.toUpperCase(),
				}),
			);
			dispatch({ type: "textureToDelete", value: null });
			await load();
		} catch (error) {
			handleApiError(error);
		} finally {
			dispatch({ type: "deletingTexture", value: false });
		}
	};

	const previewSkinUrl = skinTexture?.url ?? null;
	const previewCapeUrl = capeTexture?.url ?? null;
	const headerActions = useMemo(
		() => (
			<>
				<Button
					type="button"
					variant="outline"
					size="sm"
					render={<Link to="/dashboard/admin/users" />}
				>
					<Icon name="ArrowLeft" className="mr-2 size-4" />
					{t("admin.minecraftProfilePage.backToUsers")}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void load()}
					disabled={loading}
				>
					<Icon
						name={loading ? "Spinner" : "ArrowsClockwise"}
						className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"}
					/>
					{t("common.refresh")}
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={() => dispatch({ type: "deleteDialogOpen", value: true })}
					disabled={deletingProfile}
				>
					<Icon name="Trash" className="mr-2 size-4" />
					{t("common.delete")}
				</Button>
			</>
		),
		[deletingProfile, load, loading, t],
	);

	if (!uuid) {
		return (
			<AdminPageShell>
				<AdminSurface>
					<div className="space-y-2">
						<h1 className="text-lg font-semibold">
							{t("admin.minecraftProfilePage.title")}
						</h1>
						<p className="text-sm text-muted-foreground">
							{t("admin.minecraftProfilePage.missingUuid")}
						</p>
					</div>
				</AdminSurface>
			</AdminPageShell>
		);
	}

	return (
		<AdminPageShell>
			<AdminPageHeader
				icon="User"
				title={profile?.name ?? t("admin.minecraftProfilePage.title")}
				description={t("admin.minecraftProfilePage.description")}
				actions={headerActions}
			/>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
				<AdminSurface className="grid gap-4">
					<ProfileSummaryPanel
						capeTexture={capeTexture}
						profile={profile}
						skinTexture={skinTexture}
						uuid={uuid}
						onSelectTextureDelete={(texture) =>
							dispatch({ type: "textureToDelete", value: texture })
						}
					/>
				</AdminSurface>

				<div className="grid gap-4">
					<AdminSurface padded={false} className="overflow-hidden">
						<MinecraftPreview
							label={t("admin.minecraftProfilePage.preview")}
							skinUrl={previewSkinUrl}
							capeUrl={previewCapeUrl}
							model={profile?.texture_model ?? "default"}
							className="rounded-none border-0 shadow-none"
						/>
					</AdminSurface>

					<AdminSurface className="grid gap-3">
						<ProfileTextureList
							deletingTexture={deletingTexture}
							loading={loading}
							textures={textures}
							onRefresh={() => void load()}
							onSelectDelete={(texture) =>
								dispatch({ type: "textureToDelete", value: texture })
							}
						/>
					</AdminSurface>
				</div>
			</div>

			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={(open) =>
					dispatch({ type: "deleteDialogOpen", value: open })
				}
				title={t("admin.minecraftProfilePage.deleteTitle")}
				description={t("admin.minecraftProfilePage.deleteDescription")}
				cancelLabel={t("common.cancel")}
				confirmLabel={t("common.delete")}
				variant="destructive"
				loading={deletingProfile}
				onConfirm={() => void handleDeleteProfile()}
			/>

			<ConfirmDialog
				open={textureToDelete != null}
				onOpenChange={(open) => {
					if (!open) dispatch({ type: "textureToDelete", value: null });
				}}
				title={t("admin.minecraftProfilePage.deleteTextureTitle")}
				description={t("admin.minecraftProfilePage.deleteTextureDescription", {
					textureType: textureToDelete?.texture_type.toUpperCase() ?? "",
				})}
				cancelLabel={t("common.cancel")}
				confirmLabel={t("common.delete")}
				variant="destructive"
				loading={deletingTexture}
				onConfirm={() => void handleDeleteTexture()}
			/>
		</AdminPageShell>
	);
}

import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { CopyField } from "@/components/yggdrasil/CopyField";
import { InfoTile } from "./InfoTile";
import { TextureSlotCard } from "./TextureSlotCard";
import type {
	AdminMinecraftProfileInfo,
	MinecraftTextureMetadata,
} from "./types";

export function ProfileSummaryPanel({
	capeTexture,
	profile,
	skinTexture,
	uuid,
	onSelectTextureDelete,
}: {
	capeTexture: MinecraftTextureMetadata | null;
	profile: AdminMinecraftProfileInfo | null;
	skinTexture: MinecraftTextureMetadata | null;
	uuid: string;
	onSelectTextureDelete: (texture: MinecraftTextureMetadata | null) => void;
}) {
	const { t } = useTranslation();
	return (
		<>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<InfoTile
					label={t("admin.minecraftProfilePage.profileId")}
					value={profile?.id?.toString() ?? "-"}
					mono
				/>
				<InfoTile
					label={t("admin.minecraftProfilePage.userId")}
					value={profile?.user_id?.toString() ?? "-"}
					mono
				/>
				<InfoTile
					label={t("admin.minecraftProfilePage.createdAt")}
					value={profile?.created_at ?? "-"}
				/>
				<InfoTile
					label={t("admin.minecraftProfilePage.updatedAt")}
					value={profile?.updated_at ?? "-"}
				/>
			</div>

			<Separator />

			<div className="grid gap-3 md:grid-cols-2">
				<CopyField
					label={t("admin.minecraftProfilePage.profileUuid")}
					value={profile?.uuid ?? uuid}
					compact
				/>
				<CopyField
					label={t("admin.minecraftProfilePage.profileName")}
					value={profile?.name ?? "-"}
					compact
				/>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<TextureSlotCard
					title={t("admin.minecraftProfilePage.skin")}
					texture={skinTexture}
					onDelete={() => onSelectTextureDelete(skinTexture)}
				/>
				<TextureSlotCard
					title={t("admin.minecraftProfilePage.cape")}
					texture={capeTexture}
					onDelete={() => onSelectTextureDelete(capeTexture)}
				/>
			</div>
		</>
	);
}

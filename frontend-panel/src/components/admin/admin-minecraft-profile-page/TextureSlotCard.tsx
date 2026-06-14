import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { MinecraftTextureMetadata } from "./types";

export function TextureSlotCard({
	onDelete,
	texture,
	title,
}: {
	onDelete: () => void;
	texture: MinecraftTextureMetadata | null;
	title: string;
}) {
	const { t } = useTranslation();
	return (
		<div className="rounded-lg border border-border/70 bg-background/60 p-3">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold">{title}</p>
					<p className="truncate text-xs text-muted-foreground">
						{texture
							? texture.hash
							: t("admin.minecraftProfilePage.noTextureSlot")}
					</p>
				</div>
				{texture ? (
					<Button type="button" variant="outline" size="sm" onClick={onDelete}>
						<Icon name="Trash" className="size-4" />
						{t("common.delete")}
					</Button>
				) : null}
			</div>
		</div>
	);
}

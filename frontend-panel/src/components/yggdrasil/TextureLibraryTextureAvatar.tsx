import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PublicTextureLibraryTextureMetadata } from "@/types/api";
import { MinecraftSkinAvatar } from "./MinecraftSkinAvatar";

type TextureLibraryTextureAvatarTexture = Pick<
	PublicTextureLibraryTextureMetadata,
	"id" | "name" | "preview_url" | "texture_type" | "url"
>;

type TextureLibraryTextureAvatarProps = {
	className?: string;
	imageTestId?: string;
	texture: TextureLibraryTextureAvatarTexture;
	testId?: string;
};

export function TextureLibraryTextureAvatar({
	className,
	imageTestId,
	testId,
	texture,
}: TextureLibraryTextureAvatarProps) {
	const { t } = useTranslation();
	const label =
		texture.name ||
		t("wardrobe.texturePreviewAlt", {
			type: t(`wardrobe.type.${texture.texture_type}`),
		});

	if (texture.texture_type === "skin") {
		return (
			<MinecraftSkinAvatar
				name={label}
				skinUrl={texture.url}
				className={className}
				testId={testId}
				imageTestId={imageTestId}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			className={cn(
				"grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/45 text-muted-foreground shadow-xs dark:bg-white/7",
				className,
			)}
			data-testid={testId}
			title={label}
		>
			<img
				src={texture.preview_url ?? texture.url}
				alt=""
				crossOrigin="anonymous"
				draggable={false}
				className="max-h-[calc(100%-8px)] max-w-[calc(100%-8px)] object-contain [image-rendering:pixelated]"
				data-testid={imageTestId}
				loading="lazy"
			/>
		</span>
	);
}

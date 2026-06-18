import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type MinecraftSkinAvatarProps = {
	className?: string;
	imageTestId?: string;
	name: string;
	skinUrl: string | null;
	testId?: string;
};

export function MinecraftSkinAvatar({
	className,
	imageTestId,
	name,
	skinUrl,
	testId,
}: MinecraftSkinAvatarProps) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const resolvedSkinUrl = skinUrl && skinUrl !== failedUrl ? skinUrl : null;

	return (
		<span
			aria-hidden="true"
			className={cn(
				"relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/45 text-muted-foreground shadow-xs dark:bg-white/7",
				className,
			)}
			data-testid={testId}
			title={name}
		>
			{resolvedSkinUrl ? (
				<>
					<CroppedSkinLayer
						src={resolvedSkinUrl}
						testId={imageTestId}
						className="inset-[2px]"
						translateX="-12.5%"
						onError={() => setFailedUrl(resolvedSkinUrl)}
					/>
					<CroppedSkinLayer
						src={resolvedSkinUrl}
						className="inset-0 opacity-95"
						translateX="-62.5%"
						onError={() => setFailedUrl(resolvedSkinUrl)}
					/>
				</>
			) : (
				<Icon name="User" className="size-4" />
			)}
		</span>
	);
}

function CroppedSkinLayer({
	className,
	onError,
	src,
	testId,
	translateX,
}: {
	className?: string;
	onError: () => void;
	src: string;
	testId?: string;
	translateX: "-12.5%" | "-62.5%";
}) {
	return (
		<span
			className={cn("absolute overflow-hidden", className)}
			data-slot="minecraft-skin-avatar-layer"
		>
			<img
				src={src}
				alt=""
				draggable={false}
				className="absolute top-0 left-0 h-[800%] w-[800%] max-w-none object-fill [image-rendering:pixelated]"
				data-testid={testId}
				style={{
					transform: `translate(${translateX}, -12.5%)`,
				}}
				onError={onError}
			/>
		</span>
	);
}

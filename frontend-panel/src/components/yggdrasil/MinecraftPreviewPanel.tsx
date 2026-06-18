import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MinecraftPreviewProps } from "./MinecraftPreview";

const MinecraftPreview = lazy(() =>
	import("@/components/yggdrasil/MinecraftPreview").then((module) => ({
		default: module.MinecraftPreview,
	})),
);

type MinecraftPreviewPanelProps = MinecraftPreviewProps & {
	containerClassName?: string;
	skeletonClassName?: string;
};

export function MinecraftPreviewPanel({
	containerClassName,
	skeletonClassName,
	...previewProps
}: MinecraftPreviewPanelProps) {
	return (
		<div className={cn("min-w-0", containerClassName)}>
			<Suspense
				fallback={
					<MinecraftPreviewPanelSkeleton
						className={skeletonClassName}
						frameClassName={previewProps.frameClassName}
					/>
				}
			>
				<MinecraftPreview {...previewProps} />
			</Suspense>
		</div>
	);
}

function MinecraftPreviewPanelSkeleton({
	className,
	frameClassName,
}: {
	className?: string;
	frameClassName?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs",
				className,
			)}
		>
			<div className="flex min-h-12 items-center justify-between border-b border-border/70 px-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
				<Skeleton className="size-7 rounded-md" />
			</div>
			<Skeleton className={cn("h-[26rem] rounded-none", frameClassName)} />
		</div>
	);
}

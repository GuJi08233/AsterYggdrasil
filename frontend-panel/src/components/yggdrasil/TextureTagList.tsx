import type { UIEvent } from "react";
import { cn } from "@/lib/utils";
import type { MinecraftTextureTagInfo } from "@/types/api";

export function TextureTagChips({
	className,
	tags,
}: {
	className?: string;
	tags: MinecraftTextureTagInfo[];
}) {
	if (tags.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap gap-1", className)}>
			{tags.map((tag) => (
				<span
					key={tag.id}
					className="rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium"
					style={{
						borderColor: `${tag.color}55`,
						color: tag.color,
					}}
				>
					{tag.name}
				</span>
			))}
		</div>
	);
}

export function TextureTagPickerList({
	className,
	disabled = false,
	emptyLabel,
	hasMore,
	loading,
	loadingLabel,
	onLoadMore,
	onToggle,
	selectedIds,
	tags,
}: {
	className?: string;
	disabled?: boolean;
	emptyLabel: string;
	hasMore: boolean;
	loading: boolean;
	loadingLabel: string;
	onLoadMore: () => void;
	onToggle: (tagId: number) => void;
	selectedIds: number[];
	tags: MinecraftTextureTagInfo[];
}) {
	function maybeLoadMore(event: UIEvent<HTMLDivElement>) {
		if (loading || !hasMore) return;
		const target = event.currentTarget;
		if (target.scrollHeight - target.scrollTop - target.clientHeight < 56) {
			onLoadMore();
		}
	}

	if (tags.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
				{loading ? loadingLabel : emptyLabel}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2",
				className,
			)}
			onScroll={maybeLoadMore}
		>
			<div className="grid gap-1">
				{tags.map((tag) => (
					<label
						key={tag.id}
						className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background/70 has-disabled:cursor-not-allowed has-disabled:opacity-60"
					>
						<input
							type="checkbox"
							checked={selectedIds.includes(tag.id)}
							disabled={disabled}
							className="size-4 rounded border-border"
							onChange={() => {
								if (!disabled) {
									onToggle(tag.id);
								}
							}}
						/>
						<span
							aria-hidden="true"
							className="size-2.5 rounded-full"
							style={{ backgroundColor: tag.color }}
						/>
						<span className="truncate">{tag.name}</span>
					</label>
				))}
				{loading ? (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						{loadingLabel}
					</div>
				) : null}
			</div>
		</div>
	);
}

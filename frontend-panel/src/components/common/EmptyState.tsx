import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function EmptyState({
	action,
	className,
	description,
	icon,
	title,
}: {
	action?: ReactNode;
	className?: string;
	description?: string;
	icon?: ReactNode;
	title: string;
}) {
	return (
		<div
			className={cn(
				"grid min-h-56 place-items-center px-4 py-10 text-center",
				className,
			)}
		>
			<div className="max-w-md">
				<div className="mx-auto grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-muted/45">
					{icon ?? <Icon name="Info" className="size-5" />}
				</div>
				<div className="mt-3 text-sm font-semibold text-foreground">
					{title}
				</div>
				{description ? (
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						{description}
					</p>
				) : null}
				{action ? (
					<div className="mt-4 flex justify-center gap-2">{action}</div>
				) : null}
			</div>
		</div>
	);
}

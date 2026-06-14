import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminSurface({
	children,
	className,
	padded = true,
}: {
	children: ReactNode;
	className?: string;
	padded?: boolean;
}) {
	return (
		<div
			className={cn(
				"min-w-0 rounded-lg border border-border/70 bg-card text-card-foreground shadow-xs dark:border-white/10 dark:bg-card/90 dark:shadow-none",
				padded && "p-4",
				className,
			)}
		>
			{children}
		</div>
	);
}

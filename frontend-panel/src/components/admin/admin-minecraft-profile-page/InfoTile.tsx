import type { ReactNode } from "react";

export function InfoTile({
	label,
	mono,
	value,
}: {
	label: string;
	mono?: boolean;
	value: ReactNode;
}) {
	return (
		<div className="min-w-0 rounded-lg border border-border/70 bg-background/60 p-3">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p
				className={
					mono ? "mt-1 break-all font-mono text-sm" : "mt-1 break-words text-sm"
				}
			>
				{value}
			</p>
		</div>
	);
}

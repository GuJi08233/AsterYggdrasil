export function InfoTile({
	label,
	mono,
	value,
}: {
	label: string;
	mono?: boolean;
	value: string;
}) {
	return (
		<div className="rounded-lg border border-border/70 bg-background/60 p-3">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className={mono ? "mt-1 font-mono text-sm" : "mt-1 text-sm"}>
				{value}
			</p>
		</div>
	);
}

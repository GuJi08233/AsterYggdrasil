import { cn } from "@/lib/utils";

export function SectionTitle({
	title,
	description,
	className,
}: {
	title: string;
	description?: string;
	className?: string;
}) {
	return (
		<div className={cn("min-w-0", className)}>
			<h2 className="text-base font-medium text-foreground">{title}</h2>
			{description ? (
				<p className="mt-1 text-sm leading-5 text-muted-foreground">
					{description}
				</p>
			) : null}
		</div>
	);
}

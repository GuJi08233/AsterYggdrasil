import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
	actions,
	badge,
	className,
	description,
	icon = "Shield",
	title,
	toolbar,
}: {
	actions?: ReactNode;
	badge?: string;
	className?: string;
	description?: string;
	icon?: IconName;
	title: string;
	toolbar?: ReactNode;
}) {
	return (
		<header
			className={cn(
				"rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs dark:border-white/10 dark:bg-card/90 dark:shadow-none",
				className,
			)}
		>
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div className="flex min-w-0 gap-3">
					<div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
						<Icon name={icon} className="size-5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-xl font-semibold tracking-normal text-foreground">
								{title}
							</h1>
							{badge ? (
								<Badge variant="outline" className="rounded-md">
									{badge}
								</Badge>
							) : null}
						</div>
						{description ? (
							<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
								{description}
							</p>
						) : null}
					</div>
				</div>
				{actions ? (
					<div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
						{actions}
					</div>
				) : null}
			</div>
			{toolbar ? (
				<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 dark:border-white/10">
					{toolbar}
				</div>
			) : null}
		</header>
	);
}

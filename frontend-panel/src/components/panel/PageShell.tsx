import type { ReactNode } from "react";

export function PageShell({
	title,
	description,
	children,
	actions,
}: {
	title: string;
	description: string;
	children: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/82 p-4 shadow-xs backdrop-blur-sm md:flex-row md:items-end md:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold tracking-normal text-foreground">
						{title}
					</h1>
					<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
						{description}
					</p>
				</div>
				{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
			</header>
			{children}
		</section>
	);
}

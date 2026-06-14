import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-7",
				className,
			)}
		>
			{children}
		</section>
	);
}

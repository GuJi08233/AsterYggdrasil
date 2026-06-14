import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function AdminFilterToolbar({
	activeFilterCount,
	children,
	className,
	contentClassName,
	defaultOpen = false,
	inline = false,
	onResetFilters,
}: {
	activeFilterCount: number;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	defaultOpen?: boolean;
	inline?: boolean;
	onResetFilters?: () => void;
}) {
	const { t } = useTranslation();
	const panelId = useId();
	const [open, setOpen] = useState(defaultOpen);
	const hasActiveFilters = activeFilterCount > 0;

	return (
		<div className={cn(inline ? "contents" : "w-full space-y-2", className)}>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant={open || hasActiveFilters ? "default" : "outline"}
					size="sm"
					aria-controls={panelId}
					aria-expanded={open}
					onClick={() => setOpen((value) => !value)}
				>
					<Icon name="MagnifyingGlassPlus" className="size-4" />
					{open ? t("admin.hideFilters") : t("admin.showFilters")}
					{hasActiveFilters ? (
						<span className="ml-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-xs">
							{activeFilterCount}
						</span>
					) : null}
				</Button>
				{hasActiveFilters ? (
					<span className="text-xs text-muted-foreground">
						{t("admin.filtersActive")}
					</span>
				) : null}
				{hasActiveFilters && onResetFilters ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onResetFilters}
					>
						{t("admin.clearFilters")}
					</Button>
				) : null}
			</div>
			{open ? (
				<div
					id={panelId}
					className={cn(
						"flex w-full flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5 dark:border-white/10 dark:bg-muted/10",
						inline ? "basis-full" : undefined,
						contentClassName,
					)}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

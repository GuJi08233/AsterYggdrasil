import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type StatusIndicatorSize = "sm" | "md";
export type StatusIndicatorTone =
	| "current"
	| "danger"
	| "info"
	| "muted"
	| "primary"
	| "success"
	| "warning";

const sizeClasses: Record<StatusIndicatorSize, string> = {
	md: "size-2.5",
	sm: "size-2",
};

const toneClasses: Record<StatusIndicatorTone, string> = {
	current: "bg-current",
	danger: "bg-destructive",
	info: "bg-sky-500",
	muted: "bg-muted-foreground",
	primary: "bg-primary/75",
	success: "bg-emerald-500",
	warning: "bg-amber-500",
};

const glowClasses: Record<StatusIndicatorTone, string> = {
	current:
		"shadow-[0_0_0_5px_color-mix(in_oklch,currentColor_16%,transparent)]",
	danger:
		"shadow-[0_0_0_5px_color-mix(in_oklch,var(--destructive)_16%,transparent)]",
	info: "shadow-[0_0_0_5px_color-mix(in_oklch,var(--color-sky-500)_14%,transparent)]",
	muted:
		"shadow-[0_0_0_5px_color-mix(in_oklch,var(--muted-foreground)_14%,transparent)]",
	primary:
		"shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_16%,transparent)]",
	success:
		"shadow-[0_0_0_5px_color-mix(in_oklch,var(--color-emerald-500)_14%,transparent)]",
	warning:
		"shadow-[0_0_0_5px_color-mix(in_oklch,var(--color-amber-500)_14%,transparent)]",
};

export function StatusIndicator({
	"aria-hidden": ariaHidden,
	"aria-label": _ariaLabel,
	breathe = false,
	className,
	glow = false,
	size = "sm",
	tone = "primary",
	...props
}: ComponentProps<"span"> & {
	breathe?: boolean;
	glow?: boolean;
	size?: StatusIndicatorSize;
	tone?: StatusIndicatorTone;
}) {
	return (
		<span
			aria-hidden={ariaHidden ?? true}
			className={cn(
				"inline-flex shrink-0 rounded-full",
				sizeClasses[size],
				toneClasses[tone],
				glow && glowClasses[tone],
				breathe && "status-indicator--breathe",
				className,
			)}
			{...props}
		/>
	);
}

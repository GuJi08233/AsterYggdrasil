import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/dateTime";
import { cn } from "@/lib/utils";

type DateTimeTextProps = Omit<
	ComponentProps<"time">,
	"children" | "dateTime"
> & {
	fallback?: string;
	value: string | null | undefined;
};

export function DateTimeText({
	className,
	fallback = "-",
	value,
	...props
}: DateTimeTextProps) {
	const { i18n } = useTranslation();

	if (!value) {
		return <span className={className}>{fallback}</span>;
	}

	return (
		<time
			className={cn("break-words", className)}
			dateTime={value}
			title={value}
			{...props}
		>
			{formatDateTime(value, i18n.language)}
		</time>
	);
}

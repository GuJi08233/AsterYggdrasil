import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/themeStore";

type ThemeToggleButtonProps = {
	className?: string;
	tone?: "default" | "hero";
};

export function ThemeToggleButton({
	className,
	tone = "default",
}: ThemeToggleButtonProps) {
	const { t } = useTranslation();
	const mode = useThemeStore((state) => state.mode);
	const toggle = useThemeStore((state) => state.toggle);
	const isDark = mode === "dark";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn(
				"size-9 rounded-full",
				tone === "hero"
					? "border border-black/10 bg-white/64 text-[#102118] shadow-lg shadow-black/10 backdrop-blur hover:bg-white/80 dark:border-white/14 dark:bg-white/8 dark:text-white dark:shadow-black/20 dark:hover:bg-white/14"
					: "border border-border/60 bg-card/70 shadow-xs hover:bg-card",
				className,
			)}
			onClick={toggle}
			aria-label={t("shell.themeAction")}
			title={t("shell.themeAction")}
		>
			<Icon name={isDark ? "Sun" : "Moon"} className="size-4" />
		</Button>
	);
}

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type LanguageMenuProps = {
	className?: string;
	compactOnMobile?: boolean;
	tone?: "default" | "hero";
};

export function LanguageMenu({
	className,
	compactOnMobile = false,
	tone = "default",
}: LanguageMenuProps) {
	const { t, i18n } = useTranslation();
	const language = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
	const languageLabel =
		language === "zh-CN" ? t("login.languageZh") : t("login.languageEn");

	function changeLanguage(nextLanguage: string) {
		if (nextLanguage !== language) void i18n.changeLanguage(nextLanguage);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={cn(
							"h-10 rounded-full px-3",
							tone === "hero"
								? "border border-black/10 bg-white/64 text-[#102118] shadow-lg shadow-black/10 backdrop-blur-md hover:bg-white/80 aria-expanded:bg-white/80 dark:border-white/12 dark:bg-white/9 dark:text-white dark:hover:bg-white/14 dark:aria-expanded:bg-white/14"
								: "border border-border/60 bg-card/70 shadow-xs hover:bg-card aria-expanded:bg-card",
							compactOnMobile &&
								"size-10 justify-center p-0 sm:h-10 sm:w-auto sm:justify-start sm:px-3",
							className,
						)}
						aria-label={t("login.language")}
						title={t("login.language")}
					/>
				}
			>
				<Icon name="Globe" className="size-4" />
				<span
					className={cn(
						"min-w-0 whitespace-nowrap text-left",
						compactOnMobile ? "sr-only sm:not-sr-only" : "inline",
					)}
				>
					{languageLabel}
				</span>
				<Icon
					name="CaretDown"
					className={cn(
						"size-3.5 text-muted-foreground",
						compactOnMobile && "hidden sm:block",
					)}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="min-w-44 border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-2xl shadow-black/25 backdrop-blur-xl"
			>
				<DropdownMenuItem
					className="flex min-h-9 items-center justify-between rounded-md px-3 py-2 text-sm"
					onClick={() => changeLanguage("zh-CN")}
				>
					<span>{t("login.languageZh")}</span>
					{language === "zh-CN" ? (
						<Icon name="Check" className="size-4" />
					) : null}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex min-h-9 items-center justify-between rounded-md px-3 py-2 text-sm"
					onClick={() => changeLanguage("en-US")}
				>
					<span>{t("login.languageEn")}</span>
					{language === "en-US" ? (
						<Icon name="Check" className="size-4" />
					) : null}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

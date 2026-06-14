import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function LoginEntryFooter({ brandTitle }: { brandTitle: string }) {
	const { t } = useTranslation();
	return (
		<footer className="mx-auto w-full max-w-[92rem] px-4 pb-6 text-center text-sm text-slate-600 sm:px-8 lg:px-12 dark:text-white/64">
			<div className="inline-flex items-center gap-2">
				<Icon
					name="Shield"
					className="size-4 text-emerald-700 dark:text-emerald-300"
				/>
				<span>
					{t("login.secureFooter", {
						name: brandTitle,
					})}
				</span>
			</div>
			<div className="mt-1 text-xs text-slate-500 dark:text-white/46">
				{t("login.protocolFooter")}
			</div>
			<Link
				to="/"
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					"mt-2 text-emerald-700 hover:bg-black/5 hover:text-emerald-600 dark:text-emerald-300 dark:hover:bg-white/8 dark:hover:text-emerald-200",
				)}
			>
				<Icon name="ArrowLeft" className="size-4" />
				{t("common.backToHome")}
			</Link>
		</footer>
	);
}

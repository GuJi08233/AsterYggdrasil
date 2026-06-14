import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/icon";

export function InitEntryFooter({ brandTitle }: { brandTitle: string }) {
	const { t } = useTranslation();
	return (
		<footer className="mx-auto w-full max-w-[92rem] px-4 pb-6 text-center text-sm text-slate-600 sm:px-8 lg:px-12 dark:text-white/64">
			<div className="inline-flex items-center gap-2">
				<Icon
					name="Shield"
					className="size-4 text-emerald-700 dark:text-emerald-300"
				/>
				<span>{t("init.footer", { name: brandTitle })}</span>
			</div>
			<div className="mt-1 text-xs text-slate-500 dark:text-white/46">
				{t("login.protocolFooter")}
			</div>
		</footer>
	);
}

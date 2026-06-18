import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/icon";
import { AccentHeadline } from "./AccentHeadline";
import { type AuthFeature, AuthFeatureList } from "./AuthFeatureList";
import { LoginHeadline } from "./LoginHeadline";

export function LoginHero({
	isRegister,
	headline,
	description,
	headlineStyle,
}: {
	isRegister: boolean;
	headline: string;
	description: string;
	headlineStyle?: "accent" | "login";
}) {
	const { t } = useTranslation();
	const resolvedHeadlineStyle =
		headlineStyle ?? (isRegister ? "accent" : "login");
	const features: AuthFeature[] = isRegister
		? [
				{
					icon: "Shield",
					title: t("login.registerFeatureSecureTitle"),
					description: t("login.registerFeatureSecureDescription"),
				},
				{
					icon: "User",
					title: t("login.registerFeatureProfileTitle"),
					description: t("login.registerFeatureProfileDescription"),
				},
				{
					icon: "ChartBar",
					title: t("login.registerFeatureAuditTitle"),
					description: t("login.registerFeatureAuditDescription"),
				},
			]
		: [
				{
					icon: "Shield",
					title: t("login.featureSecureTitle"),
					description: t("login.featureSecureDescription"),
				},
				{
					icon: "User",
					title: t("login.featureProfileTitle"),
					description: t("login.featureProfileDescription"),
				},
				{
					icon: "ChartBar",
					title: t("login.featureAuditTitle"),
					description: t("login.featureAuditDescription"),
				},
			];

	return (
		<section className="hidden w-full max-w-xl justify-self-start xl:block">
			<h2 className="max-w-[13ch] text-5xl font-semibold leading-tight tracking-normal text-[#102118] dark:text-white">
				{resolvedHeadlineStyle === "accent" ? (
					<AccentHeadline text={headline} />
				) : (
					<LoginHeadline />
				)}
			</h2>
			<p className="mt-5 max-w-lg text-base leading-7 text-slate-700 dark:text-white/82">
				{description}
			</p>
			<AuthFeatureList features={features} />
			{isRegister ? (
				<div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-emerald-700/14 bg-emerald-600/10 px-4 py-3 text-sm text-slate-700 shadow-lg shadow-black/10 backdrop-blur-md dark:border-emerald-300/12 dark:bg-emerald-400/9 dark:text-white/76">
					<Icon
						name="Shield"
						className="size-5 text-emerald-700 dark:text-emerald-300"
					/>
					<span>{t("login.registerConsentHint")}</span>
				</div>
			) : null}
		</section>
	);
}

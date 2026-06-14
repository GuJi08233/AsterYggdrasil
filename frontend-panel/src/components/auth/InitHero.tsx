import { useTranslation } from "react-i18next";
import { AccentHeadline } from "./AccentHeadline";
import { type AuthFeature, AuthFeatureList } from "./AuthFeatureList";

export function InitHero() {
	const { t } = useTranslation();
	const features: AuthFeature[] = [
		{
			icon: "Shield",
			title: t("init.featureAdminTitle"),
			description: t("init.featureAdminDescription"),
		},
		{
			icon: "Globe",
			title: t("init.featureUrlTitle"),
			description: t("init.featureUrlDescription"),
		},
		{
			icon: "User",
			title: t("init.featurePlayerTitle"),
			description: t("init.featurePlayerDescription"),
		},
	];

	return (
		<section className="hidden w-full max-w-xl justify-self-start xl:block">
			<h2 className="max-w-[13ch] text-5xl font-semibold leading-tight tracking-normal text-[#102118] dark:text-white">
				<AccentHeadline text={t("init.headline")} />
			</h2>
			<p className="mt-5 max-w-lg text-base leading-7 text-slate-700 dark:text-white/82">
				{t("init.description")}
			</p>
			<AuthFeatureList features={features} />
		</section>
	);
}

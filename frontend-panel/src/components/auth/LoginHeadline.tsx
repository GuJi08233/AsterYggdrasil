import { useTranslation } from "react-i18next";

export function LoginHeadline() {
	const { t } = useTranslation();
	return (
		<>
			{t("login.welcomePrefix")}{" "}
			<span className="text-emerald-700 drop-shadow-[0_0_24px_rgba(52,211,153,0.28)] dark:text-emerald-300">
				Aster
			</span>{" "}
			{t("login.welcomeSuffix")}
		</>
	);
}

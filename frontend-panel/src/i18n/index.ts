import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/i18n/resources";

const supportedLanguages = Object.keys(resources);

function detectLanguage() {
	if (typeof navigator === "undefined") {
		return "en-US";
	}
	const preferred = navigator.languages?.[0] ?? navigator.language;
	if (supportedLanguages.includes(preferred)) {
		return preferred;
	}
	if (preferred.toLowerCase().startsWith("zh")) {
		return "zh-CN";
	}
	return "en-US";
}

void i18next.use(initReactI18next).init({
	resources,
	lng: detectLanguage(),
	fallbackLng: "en-US",
	defaultNS: "frontend",
	interpolation: {
		escapeValue: false,
	},
});

export { i18next };

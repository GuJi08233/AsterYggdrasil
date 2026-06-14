import { type FormEvent, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { InitEntryFooter } from "@/components/auth/InitEntryFooter";
import {
	InitFormCard,
	type PublicUrlStatus,
} from "@/components/auth/InitFormCard";
import { InitHero } from "@/components/auth/InitHero";
import { PublicEntryShell } from "@/components/layout/PublicEntryShell";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatUnknownError } from "@/services/http";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import { useInitStatusStore } from "@/stores/initStatusStore";

function detectedPublicUrl() {
	if (typeof window === "undefined") return "https://example.com";
	return window.location.origin;
}

function isLocalHost(hostname: string) {
	return (
		hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
	);
}

function validatePublicSiteUrl(value: string): PublicUrlStatus {
	const trimmed = value.trim();
	if (!trimmed) {
		return { valid: false, messageKey: "init.publicSiteUrlRequired" };
	}
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return { valid: false, messageKey: "init.publicSiteUrlProtocol" };
		}
		if (url.pathname !== "/" || url.search || url.hash) {
			return { valid: false, messageKey: "init.publicSiteUrlOriginOnly" };
		}
		return {
			valid: true,
			normalized: url.origin,
			insecure: url.protocol === "http:" && !isLocalHost(url.hostname),
		};
	} catch {
		return { valid: false, messageKey: "init.publicSiteUrlInvalid" };
	}
}

function getPasswordScore(password: string) {
	if (!password) return 0;
	let score = 0;
	if (password.length >= 8) score += 1;
	if (password.length >= 12) score += 1;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
	if (/\d/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;
	return Math.min(score, 4);
}

type InitFormState = {
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	publicSiteUrl: string;
	showPassword: boolean;
	loading: boolean;
};

type InitFormAction =
	| {
			type: "field";
			name:
				| "username"
				| "email"
				| "password"
				| "confirmPassword"
				| "publicSiteUrl";
			value: string;
	  }
	| { type: "togglePassword" }
	| { type: "loading"; value: boolean };

function initFormReducer(
	state: InitFormState,
	action: InitFormAction,
): InitFormState {
	switch (action.type) {
		case "field":
			return { ...state, [action.name]: action.value };
		case "togglePassword":
			return { ...state, showPassword: !state.showPassword };
		case "loading":
			return { ...state, loading: action.value };
	}
}

export default function InitPage() {
	const { t, i18n } = useTranslation();
	const setup = useAuthStore((state) => state.setup);
	const branding = useFrontendConfigStore((state) => state.branding);
	const initialized = useInitStatusStore((state) => state.initialized);
	const markInitialized = useInitStatusStore((state) => state.markInitialized);
	const navigate = useNavigate();
	const [form, dispatch] = useReducer(initFormReducer, undefined, () => ({
		username: "",
		email: "",
		password: "",
		confirmPassword: "",
		publicSiteUrl: detectedPublicUrl(),
		showPassword: false,
		loading: false,
	}));

	const publicUrlStatus = useMemo(
		() => validatePublicSiteUrl(form.publicSiteUrl),
		[form.publicSiteUrl],
	);
	const passwordScore = getPasswordScore(form.password);
	const passwordStrengthKey =
		passwordScore <= 1
			? "login.passwordStrengthWeak"
			: passwordScore <= 3
				? "login.passwordStrengthMedium"
				: "login.passwordStrengthStrong";
	const submitDisabled =
		form.loading ||
		!form.username.trim() ||
		!form.email.trim() ||
		!form.password ||
		!form.confirmPassword ||
		form.password !== form.confirmPassword ||
		!publicUrlStatus.valid;
	const brandTitle = branding.title || t("brand.name");
	const language = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
	const languageLabel =
		language === "zh-CN" ? t("login.languageZh") : t("login.languageEn");

	usePageTitle(t("init.title"));

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (form.password !== form.confirmPassword) {
			toast.error(t("login.passwordMismatch"));
			return;
		}
		if (!publicUrlStatus.valid) {
			toast.error(t(publicUrlStatus.messageKey));
			return;
		}

		dispatch({ type: "loading", value: true });
		try {
			await setup(
				form.username,
				form.email,
				form.password,
				publicUrlStatus.normalized,
			);
			markInitialized();
			toast.success(t("init.setupComplete"));
			navigate("/dashboard", { replace: true });
		} catch (nextError) {
			toast.error(formatUnknownError(nextError));
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}

	if (initialized === true) {
		return <Navigate to="/login" replace />;
	}

	return (
		<PublicEntryShell
			branding={branding}
			title={brandTitle}
			tagline={t("brand.tagline")}
			language={language}
			languageLabel={languageLabel}
			languageAriaLabel={t("login.language")}
			languageZhLabel={t("login.languageZh")}
			languageEnLabel={t("login.languageEn")}
			onLanguageChange={(next) => {
				if (next) void i18n.changeLanguage(next);
			}}
			variant="auth"
		>
			<main className="app-route-transition mx-auto grid w-full max-w-[92rem] flex-1 items-center gap-8 px-4 py-8 sm:px-8 lg:px-12 xl:grid-cols-[minmax(560px,1fr)_minmax(430px,520px)]">
				<InitHero />
				<InitFormCard
					username={form.username}
					email={form.email}
					password={form.password}
					confirmPassword={form.confirmPassword}
					publicSiteUrl={form.publicSiteUrl}
					showPassword={form.showPassword}
					loading={form.loading}
					submitDisabled={submitDisabled}
					passwordScore={passwordScore}
					passwordStrengthLabel={t(passwordStrengthKey)}
					publicUrlStatus={publicUrlStatus}
					onSubmit={submit}
					onUsernameChange={(value) =>
						dispatch({ type: "field", name: "username", value })
					}
					onEmailChange={(value) =>
						dispatch({ type: "field", name: "email", value })
					}
					onPasswordChange={(value) =>
						dispatch({ type: "field", name: "password", value })
					}
					onConfirmPasswordChange={(value) =>
						dispatch({ type: "field", name: "confirmPassword", value })
					}
					onPublicSiteUrlChange={(value) =>
						dispatch({ type: "field", name: "publicSiteUrl", value })
					}
					onToggleShowPassword={() => dispatch({ type: "togglePassword" })}
				/>
			</main>

			<InitEntryFooter brandTitle={brandTitle} />
		</PublicEntryShell>
	);
}

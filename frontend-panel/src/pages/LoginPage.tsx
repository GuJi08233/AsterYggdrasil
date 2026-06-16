import { type FormEvent, useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoginEntryFooter } from "@/components/auth/LoginEntryFooter";
import { LoginFormCard } from "@/components/auth/LoginFormCard";
import { LoginHero } from "@/components/auth/LoginHero";
import { PublicEntryShell } from "@/components/layout/PublicEntryShell";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
	getPasskeyCredential,
	isWebAuthnSupported,
	WebAuthnCancelledError,
	WebAuthnUnsupportedError,
} from "@/lib/webauthn";
import { accountPaths } from "@/routes/routePaths";
import { authService } from "@/services/authService";
import { externalAuthService } from "@/services/externalAuthService";
import { formatUnknownError } from "@/services/http";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";
import type { ExternalAuthPublicProvider } from "@/types/api";

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

type LoginFormState = {
	identifier: string;
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	showPassword: boolean;
	acceptedTerms: boolean;
	providers: ExternalAuthPublicProvider[];
	externalLoadingKey: string | null;
	loading: boolean;
	passkeySubmitting: boolean;
};

type LoginFormAction =
	| {
			type: "field";
			name:
				| "identifier"
				| "username"
				| "email"
				| "password"
				| "confirmPassword";
			value: string;
	  }
	| { type: "togglePassword" }
	| { type: "acceptedTerms"; value: boolean }
	| { type: "providers"; value: ExternalAuthPublicProvider[] }
	| { type: "externalLoadingKey"; value: string | null }
	| { type: "loading"; value: boolean }
	| { type: "passkeySubmitting"; value: boolean }
	| { type: "resetAccountOptions" };

function loginFormReducer(
	state: LoginFormState,
	action: LoginFormAction,
): LoginFormState {
	switch (action.type) {
		case "field":
			return { ...state, [action.name]: action.value };
		case "togglePassword":
			return { ...state, showPassword: !state.showPassword };
		case "acceptedTerms":
			return { ...state, acceptedTerms: action.value };
		case "providers":
			return { ...state, providers: action.value };
		case "externalLoadingKey":
			return { ...state, externalLoadingKey: action.value };
		case "loading":
			return { ...state, loading: action.value };
		case "passkeySubmitting":
			return { ...state, passkeySubmitting: action.value };
		case "resetAccountOptions":
			return { ...state, confirmPassword: "", acceptedTerms: false };
	}
}

const initialLoginFormState: LoginFormState = {
	identifier: "",
	username: "",
	email: "",
	password: "",
	confirmPassword: "",
	showPassword: false,
	acceptedTerms: false,
	providers: [],
	externalLoadingKey: null,
	loading: false,
	passkeySubmitting: false,
};

export default function LoginPage() {
	const { t } = useTranslation();
	const location = useLocation();
	const [form, dispatch] = useReducer(loginFormReducer, initialLoginFormState);
	const {
		identifier,
		username,
		email,
		password,
		confirmPassword,
		showPassword,
		acceptedTerms,
		providers,
		externalLoadingKey,
		loading,
		passkeySubmitting,
	} = form;
	const passkeySupported = isWebAuthnSupported();
	const login = useAuthStore((state) => state.login);
	const loginWithPasskey = useAuthStore((state) => state.loginWithPasskey);
	const register = useAuthStore((state) => state.register);
	const branding = useFrontendConfigStore((state) => state.branding);
	const allowUserRegistration = useFrontendConfigStore(
		(state) => state.allowUserRegistration,
	);
	const passkeyLoginEnabled = useFrontendConfigStore(
		(state) => state.passkeyLoginEnabled,
	);
	const navigate = useNavigate();

	useEffect(() => {
		void import("@/lib/pwaWarmup").then(({ warmupLoginSuccessPath }) => {
			warmupLoginSuccessPath();
		});
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		externalAuthService
			.listPublic(controller.signal)
			.then((nextProviders) =>
				dispatch({ type: "providers", value: nextProviders }),
			)
			.catch(() => undefined);
		return () => controller.abort();
	}, []);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		dispatch({ type: "loading", value: true });
		try {
			if (usesAccountCreationForm && password !== confirmPassword) {
				toast.error(t("login.passwordMismatch"));
				return;
			}
			if (isRegister) {
				await register(username, email, password);
				toast.success(t("login.registerSuccess"));
			} else {
				await login(identifier, password);
				toast.success(t("login.loginSuccess"));
			}
			navigate(accountPaths.home);
		} catch (nextError) {
			toast.error(formatUnknownError(nextError));
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}

	async function startExternalLogin(provider: ExternalAuthPublicProvider) {
		dispatch({ type: "externalLoadingKey", value: provider.key });
		try {
			const response = await externalAuthService.startAuthAlias(
				provider.kind,
				provider.key,
				{
					return_path: accountPaths.home,
				},
			);
			window.location.assign(response.authorization_url);
		} catch (nextError) {
			toast.error(formatUnknownError(nextError));
			dispatch({ type: "externalLoadingKey", value: null });
		}
	}

	async function startPasskeyLogin() {
		if (!passkeySupported) {
			toast.error(t("login.passkeyUnsupported"));
			return;
		}
		dispatch({ type: "passkeySubmitting", value: true });
		try {
			const start = await authService.startPasskeyLogin({
				identifier: identifier.trim() || undefined,
			});
			const credential = await getPasskeyCredential(start.public_key);
			await loginWithPasskey(start.flow_id, credential);
			toast.success(t("login.loginSuccess"));
			navigate(accountPaths.home);
		} catch (nextError) {
			if (nextError instanceof WebAuthnUnsupportedError) {
				toast.error(t("login.passkeyUnsupported"));
				return;
			}
			if (nextError instanceof WebAuthnCancelledError) {
				toast.error(t("login.passkeyCancelled"));
				return;
			}
			toast.error(formatUnknownError(nextError));
		} finally {
			dispatch({ type: "passkeySubmitting", value: false });
		}
	}

	const isRegister = location.pathname === "/register";
	const usesAccountCreationForm = isRegister;
	const passwordScore = getPasswordScore(password);
	const passwordStrengthKey =
		passwordScore <= 1
			? "login.passwordStrengthWeak"
			: passwordScore <= 3
				? "login.passwordStrengthMedium"
				: "login.passwordStrengthStrong";
	const headline = isRegister
		? t("login.registerHeadline")
		: t("login.welcomeTitle");
	const description = isRegister
		? t("login.registerHeroDescription")
		: t("login.welcomeDescription");
	const cardTitle = isRegister ? t("login.registerTitle") : t("login.title");
	const cardDescription = isRegister
		? t("login.registerDescription")
		: t("login.cardDescription");
	const submitLabel = isRegister ? t("login.registerNow") : t("nav.login");
	const submitDisabled =
		loading ||
		(usesAccountCreationForm
			? !username.trim() ||
				!email.trim() ||
				!password ||
				!confirmPassword ||
				password !== confirmPassword ||
				(isRegister && !acceptedTerms)
			: !identifier.trim() || !password);
	const brandTitle = branding.title || t("brand.name");
	const visibleProviders = providers.slice(0, 3);
	const showPasskeyLogin = !usesAccountCreationForm && passkeyLoginEnabled;

	usePageTitle(cardTitle);

	return (
		<PublicEntryShell
			branding={branding}
			title={brandTitle}
			tagline={t("brand.tagline")}
			variant="auth"
		>
			<main className="app-route-transition mx-auto grid w-full max-w-[92rem] flex-1 items-center gap-8 px-4 py-8 sm:px-8 lg:px-12 xl:grid-cols-[minmax(560px,1fr)_minmax(430px,520px)]">
				<LoginHero
					isRegister={isRegister}
					headline={headline}
					description={description}
				/>
				<LoginFormCard
					isRegister={isRegister}
					usesAccountCreationForm={usesAccountCreationForm}
					cardTitle={cardTitle}
					cardDescription={cardDescription}
					identifier={identifier}
					username={username}
					email={email}
					password={password}
					confirmPassword={confirmPassword}
					showPassword={showPassword}
					acceptedTerms={acceptedTerms}
					visibleProviders={visibleProviders}
					externalLoadingKey={externalLoadingKey}
					loading={loading}
					passkeySubmitting={passkeySubmitting}
					passkeySupported={passkeySupported}
					showPasskeyLogin={showPasskeyLogin}
					submitDisabled={submitDisabled}
					submitLabel={submitLabel}
					passwordScore={passwordScore}
					passwordStrengthLabel={t(passwordStrengthKey)}
					allowUserRegistration={allowUserRegistration}
					onSubmit={submit}
					onIdentifierChange={(value) =>
						dispatch({ type: "field", name: "identifier", value })
					}
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
					onToggleShowPassword={() => dispatch({ type: "togglePassword" })}
					onAcceptedTermsChange={(value) =>
						dispatch({ type: "acceptedTerms", value })
					}
					onPasskeyLogin={() => void startPasskeyLogin()}
					onExternalLogin={(provider) => void startExternalLogin(provider)}
					onResetAccountOptions={() =>
						dispatch({ type: "resetAccountOptions" })
					}
				/>
			</main>

			<LoginEntryFooter brandTitle={brandTitle} />
		</PublicEntryShell>
	);
}

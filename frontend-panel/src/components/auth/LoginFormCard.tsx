import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	externalAuthKindIconPath,
	normalizeExternalAuthIconUrl,
} from "@/lib/externalAuthProviders";
import { cn } from "@/lib/utils";
import type { ExternalAuthPublicProvider } from "@/types/api";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

const loginInputClassName =
	"h-12 rounded-lg border-black/10 bg-white/70 text-[#102118] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] [caret-color:#102118] [-webkit-text-fill-color:#102118] placeholder:text-slate-500 focus-visible:border-emerald-700/32 focus-visible:bg-white/82 focus-visible:ring-3 focus-visible:ring-emerald-500/18 dark:border-white/14 dark:bg-neutral-950/42 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:[caret-color:white] dark:[-webkit-text-fill-color:white] dark:placeholder:text-white/42 dark:focus-visible:border-emerald-300/45 dark:focus-visible:bg-neutral-950/52 dark:focus-visible:ring-emerald-400/20 [&:-webkit-autofill]:border-black/10 [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(255,255,255,0.92)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#102118] dark:[&:-webkit-autofill]:border-white/14 dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(20,28,25,0.98)_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white] dark:[&:-webkit-autofill:focus]:shadow-[0_0_0_1000px_rgba(20,28,25,0.98)_inset]";

export function LoginFormCard({
	isRegister,
	usesAccountCreationForm,
	cardTitle,
	cardDescription,
	identifier,
	username,
	email,
	password,
	confirmPassword,
	showPassword,
	acceptedTerms,
	visibleProviders,
	externalLoadingKey,
	loading,
	passkeySubmitting,
	passkeySupported,
	showPasskeyLogin,
	submitDisabled,
	submitLabel,
	passwordScore,
	passwordStrengthLabel,
	allowUserRegistration,
	onSubmit,
	onIdentifierChange,
	onUsernameChange,
	onEmailChange,
	onPasswordChange,
	onConfirmPasswordChange,
	onToggleShowPassword,
	onAcceptedTermsChange,
	onPasskeyLogin,
	onExternalLogin,
	onResetAccountOptions,
}: {
	isRegister: boolean;
	usesAccountCreationForm: boolean;
	cardTitle: string;
	cardDescription: string;
	identifier: string;
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	showPassword: boolean;
	acceptedTerms: boolean;
	visibleProviders: ExternalAuthPublicProvider[];
	externalLoadingKey: string | null;
	loading: boolean;
	passkeySubmitting: boolean;
	passkeySupported: boolean;
	showPasskeyLogin: boolean;
	submitDisabled: boolean;
	submitLabel: string;
	passwordScore: number;
	passwordStrengthLabel: string;
	allowUserRegistration: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onIdentifierChange: (value: string) => void;
	onUsernameChange: (value: string) => void;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onConfirmPasswordChange: (value: string) => void;
	onToggleShowPassword: () => void;
	onAcceptedTermsChange: (value: boolean) => void;
	onPasskeyLogin: () => void;
	onExternalLogin: (provider: ExternalAuthPublicProvider) => void;
	onResetAccountOptions: () => void;
}) {
	const { t } = useTranslation();
	return (
		<section
			key={isRegister ? "register" : "login"}
			className="auth-card-transition relative mx-auto w-full max-w-[520px] rounded-[1.35rem] border border-black/10 bg-white/78 p-6 shadow-[0_24px_90px_rgba(15,35,25,0.18),0_0_0_1px_rgba(255,255,255,0.52),0_0_58px_rgba(22,163,74,0.10)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:border before:border-emerald-700/8 dark:border-white/11 dark:bg-neutral-950/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.42),0_0_0_1px_rgba(120,255,190,0.04),0_0_58px_rgba(82,255,170,0.18)] dark:before:border-emerald-300/9 sm:p-9"
		>
			<div>
				<h1 className="text-3xl font-semibold tracking-normal text-[#102118] sm:text-4xl dark:text-white">
					{cardTitle}
				</h1>
				<p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/72">
					{cardDescription}
				</p>
			</div>
			<form className="mt-7 grid gap-4" onSubmit={onSubmit}>
				{usesAccountCreationForm ? (
					<>
						<div className="grid gap-2">
							<Label
								htmlFor="username"
								className="text-slate-700 dark:text-white/88"
							>
								{t("login.username")}
							</Label>
							<div className="relative">
								<Icon
									name="User"
									className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
								/>
								<Input
									id="username"
									value={username}
									onChange={(event) =>
										onUsernameChange(event.currentTarget.value)
									}
									autoComplete="username"
									minLength={4}
									placeholder={t("login.usernamePlaceholder")}
									className={cn(loginInputClassName, "pr-4 pl-11")}
									required
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label
								htmlFor="email"
								className="text-slate-700 dark:text-white/88"
							>
								{t("login.email")}
							</Label>
							<div className="relative">
								<Icon
									name="EnvelopeSimple"
									className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
								/>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(event) => onEmailChange(event.currentTarget.value)}
									autoComplete="email"
									placeholder={t("login.emailPlaceholder")}
									className={cn(loginInputClassName, "pr-4 pl-11")}
									required
								/>
							</div>
						</div>
					</>
				) : (
					<div className="grid gap-2">
						<Label
							htmlFor="identifier"
							className="text-slate-700 dark:text-white/88"
						>
							{t("login.identifier")}
						</Label>
						<div className="relative">
							<Icon
								name="User"
								className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
							/>
							<Input
								id="identifier"
								value={identifier}
								onChange={(event) =>
									onIdentifierChange(event.currentTarget.value)
								}
								autoComplete="username"
								placeholder={t("login.identifierPlaceholder")}
								className={cn(loginInputClassName, "pr-4 pl-11")}
								required
							/>
						</div>
					</div>
				)}
				<div className="grid gap-2">
					<Label
						htmlFor="password"
						className="text-slate-700 dark:text-white/88"
					>
						{t("login.password")}
					</Label>
					<div className="relative">
						<Icon
							name="Lock"
							className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
						/>
						<Input
							id="password"
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(event) => onPasswordChange(event.currentTarget.value)}
							autoComplete={
								usesAccountCreationForm ? "new-password" : "current-password"
							}
							placeholder={t("login.passwordPlaceholder")}
							className={cn(loginInputClassName, "pr-11 pl-11")}
							required
						/>
						<button
							type="button"
							className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-transparent text-slate-500 transition-colors outline-none hover:text-slate-800 focus-visible:ring-3 focus-visible:ring-emerald-500/18 dark:text-white/62 dark:hover:text-white dark:focus-visible:ring-emerald-400/20"
							onClick={onToggleShowPassword}
							aria-label={
								showPassword ? t("login.hidePassword") : t("login.showPassword")
							}
						>
							<Icon
								name={showPassword ? "EyeSlash" : "Eye"}
								className="size-4"
							/>
						</button>
					</div>
				</div>
				{usesAccountCreationForm ? (
					<>
						<div className="grid gap-2">
							<Label
								htmlFor="confirm-password"
								className="text-slate-700 dark:text-white/88"
							>
								{t("login.confirmPassword")}
							</Label>
							<div className="relative">
								<Icon
									name="Lock"
									className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
								/>
								<Input
									id="confirm-password"
									type={showPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(event) =>
										onConfirmPasswordChange(event.currentTarget.value)
									}
									autoComplete="new-password"
									placeholder={t("login.confirmPasswordPlaceholder")}
									className={cn(loginInputClassName, "pr-11 pl-11")}
									required
								/>
							</div>
						</div>
						<PasswordStrengthMeter
							label={t("login.passwordStrength")}
							value={passwordStrengthLabel}
							score={passwordScore}
						/>
						{isRegister ? (
							<label className="flex items-center gap-3 rounded-lg border border-black/10 bg-white/55 p-3 text-sm leading-5 text-slate-700 dark:border-white/8 dark:bg-white/5 dark:text-white/76">
								<input
									type="checkbox"
									checked={acceptedTerms}
									onChange={(event) =>
										onAcceptedTermsChange(event.currentTarget.checked)
									}
									className="peer sr-only"
								/>
								<span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-black/16 bg-white/70 text-transparent transition-colors peer-checked:border-emerald-700/40 peer-checked:bg-emerald-600/12 peer-checked:text-emerald-700 peer-focus-visible:ring-3 peer-focus-visible:ring-emerald-500/20 dark:border-white/16 dark:bg-black/20 dark:peer-checked:border-emerald-300/60 dark:peer-checked:bg-emerald-400/20 dark:peer-checked:text-emerald-300 dark:peer-focus-visible:ring-emerald-400/25">
									<Icon name="Check" className="size-3.5" />
								</span>
								<span>{t("login.acceptTerms")}</span>
							</label>
						) : null}
					</>
				) : null}
				<Button
					type="submit"
					disabled={submitDisabled}
					className="h-13 rounded-lg border-0 bg-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-400 disabled:bg-emerald-500/55 disabled:text-white/58"
				>
					<Icon
						name={loading ? "Spinner" : "SignIn"}
						className={loading ? "size-4 animate-spin" : "size-4"}
					/>
					{submitLabel}
				</Button>
				{(showPasskeyLogin || visibleProviders.length > 0) && !isRegister ? (
					<div className="grid gap-3">
						<div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/52">
							<span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
							<span>{t("login.or")}</span>
							<span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
						</div>
						<div className="grid gap-2">
							{showPasskeyLogin ? (
								<Button
									type="button"
									variant="outline"
									className="h-12 rounded-lg border-black/10 bg-white/55 text-[#102118] hover:bg-white/78 disabled:text-slate-400 dark:border-white/14 dark:bg-white/3 dark:text-white dark:hover:bg-white/9 dark:disabled:text-white/38"
									onClick={onPasskeyLogin}
									disabled={passkeySubmitting || loading || !passkeySupported}
								>
									<Icon
										name={passkeySubmitting ? "Spinner" : "Key"}
										className={cn(
											"size-4",
											passkeySubmitting && "animate-spin",
										)}
									/>
									{t("login.passkeyLogin")}
								</Button>
							) : null}
							{visibleProviders.map((provider) => (
								<Button
									key={provider.key}
									type="button"
									variant="outline"
									className="h-12 rounded-lg border-black/10 bg-white/55 text-[#102118] hover:bg-white/78 dark:border-white/14 dark:bg-white/3 dark:text-white dark:hover:bg-white/9"
									onClick={() => onExternalLogin(provider)}
									disabled={externalLoadingKey !== null}
								>
									{externalLoadingKey === provider.key ? (
										<Icon name="Spinner" className="size-4 animate-spin" />
									) : (
										<ExternalProviderButtonIcon provider={provider} />
									)}
									{t("login.externalLogin", {
										provider: provider.display_name,
									})}
								</Button>
							))}
						</div>
					</div>
				) : null}
				{allowUserRegistration ? (
					<p className="text-center text-sm text-slate-700 dark:text-white/78">
						{isRegister ? t("login.hasAccount") : t("login.noAccount")}{" "}
						<Link
							to={isRegister ? "/login" : "/register"}
							className="font-semibold text-emerald-700 underline-offset-4 hover:text-emerald-600 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
							onClick={onResetAccountOptions}
						>
							{isRegister ? t("nav.login") : t("login.registerNow")}
						</Link>
					</p>
				) : null}
			</form>
		</section>
	);
}

function ExternalProviderButtonIcon({
	provider,
}: {
	provider: ExternalAuthPublicProvider;
}) {
	const configuredIcon = normalizeExternalAuthIconUrl(provider.icon_url);
	const kindIcon = externalAuthKindIconPath(provider.kind);
	const iconPath = configuredIcon || kindIcon;

	return (
		<img
			src={iconPath}
			alt=""
			aria-hidden="true"
			className="size-4 object-contain"
			onError={(event) => {
				if (
					configuredIcon &&
					event.currentTarget.dataset.fallbackTried !== "1"
				) {
					event.currentTarget.dataset.fallbackTried = "1";
					event.currentTarget.src = kindIcon;
				}
			}}
		/>
	);
}

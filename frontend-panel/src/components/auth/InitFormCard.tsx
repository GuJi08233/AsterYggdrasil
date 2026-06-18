import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
	AuthFormCard,
	AuthFormFieldError,
	AuthIconTextField,
	AuthPasswordField,
	authPrimaryButtonClassName,
} from "@/components/auth/AuthFormPrimitives";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

export type PublicUrlStatus =
	| { valid: true; normalized: string; insecure: boolean }
	| { valid: false; messageKey: string };

export type InitFormField =
	| "username"
	| "email"
	| "password"
	| "confirmPassword";

export type InitFormErrors = Partial<Record<InitFormField, string>>;

export function InitFormCard({
	username,
	email,
	password,
	confirmPassword,
	publicSiteUrl,
	errors,
	showPassword,
	loading,
	submitDisabled,
	passwordScore,
	passwordStrengthLabel,
	publicUrlStatus,
	onSubmit,
	onUsernameChange,
	onEmailChange,
	onPasswordChange,
	onConfirmPasswordChange,
	onPublicSiteUrlChange,
	onToggleShowPassword,
}: {
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	publicSiteUrl: string;
	errors: InitFormErrors;
	showPassword: boolean;
	loading: boolean;
	submitDisabled: boolean;
	passwordScore: number;
	passwordStrengthLabel: string;
	publicUrlStatus: PublicUrlStatus;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onUsernameChange: (value: string) => void;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onConfirmPasswordChange: (value: string) => void;
	onPublicSiteUrlChange: (value: string) => void;
	onToggleShowPassword: () => void;
}) {
	const { t } = useTranslation();
	return (
		<AuthFormCard
			title={t("init.title")}
			description={t("init.cardDescription")}
		>
			<form className="mt-7 grid gap-4" onSubmit={onSubmit} noValidate>
				<AuthIconTextField
					id="username"
					label={t("login.username")}
					value={username}
					error={errors.username && t(errors.username)}
					icon="User"
					autoComplete="username"
					placeholder={t("login.usernamePlaceholder")}
					minLength={4}
					maxLength={16}
					onChange={onUsernameChange}
				/>
				<AuthIconTextField
					id="email"
					label={t("login.email")}
					value={email}
					error={errors.email && t(errors.email)}
					icon="EnvelopeSimple"
					type="email"
					autoComplete="email"
					placeholder={t("login.emailPlaceholder")}
					onChange={onEmailChange}
				/>
				<AuthPasswordField
					id="password"
					label={t("login.password")}
					value={password}
					error={errors.password && t(errors.password)}
					autoComplete="new-password"
					placeholder={t("login.passwordPlaceholder")}
					maxLength={128}
					showPassword={showPassword}
					onChange={onPasswordChange}
					onToggleShowPassword={onToggleShowPassword}
				/>
				<AuthPasswordField
					id="confirm-password"
					label={t("login.confirmPassword")}
					value={confirmPassword}
					error={errors.confirmPassword && t(errors.confirmPassword)}
					autoComplete="new-password"
					placeholder={t("login.confirmPasswordPlaceholder")}
					maxLength={128}
					showPassword={showPassword}
					onChange={onConfirmPasswordChange}
				/>
				<PasswordStrengthMeter
					label={t("login.passwordStrength")}
					value={passwordStrengthLabel}
					score={passwordScore}
				/>
				<div className="grid gap-2">
					<AuthIconTextField
						id="public-site-url"
						label={t("init.publicSiteUrl")}
						value={publicSiteUrl}
						icon="Globe"
						type="url"
						autoComplete="url"
						placeholder="https://skin.example.com"
						onChange={onPublicSiteUrlChange}
					/>
					<p className="text-xs leading-5 text-slate-600 dark:text-white/66">
						{t("init.publicSiteUrlHelp")}
					</p>
					{publicUrlStatus.valid && publicUrlStatus.insecure ? (
						<p className="flex items-start gap-2 rounded-lg border border-amber-500/24 bg-amber-400/12 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-300/24 dark:bg-amber-300/10 dark:text-amber-100">
							<Icon name="Warning" className="mt-0.5 size-4 shrink-0" />
							<span>{t("init.publicSiteUrlHttpWarning")}</span>
						</p>
					) : null}
					{!publicUrlStatus.valid ? (
						<AuthFormFieldError
							id="public-site-url-error"
							message={t(publicUrlStatus.messageKey)}
							tone="panel"
						/>
					) : null}
				</div>
				<Button
					type="submit"
					disabled={submitDisabled}
					className={authPrimaryButtonClassName}
				>
					<Icon
						name={loading ? "Spinner" : "User"}
						className={loading ? "size-4 animate-spin" : "size-4"}
					/>
					{t("init.createAdmin")}
				</Button>
			</form>
		</AuthFormCard>
	);
}

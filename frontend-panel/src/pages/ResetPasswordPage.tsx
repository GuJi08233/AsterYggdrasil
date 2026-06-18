import { type FormEvent, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod/v4";
import {
	AuthFormCard,
	AuthIconTextField,
	AuthPasswordField,
	authPrimaryButtonClassName,
	authSecondaryButtonClassName,
} from "@/components/auth/AuthFormPrimitives";
import { LoginEntryFooter } from "@/components/auth/LoginEntryFooter";
import { PublicEntryShell } from "@/components/layout/PublicEntryShell";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
	confirmPasswordRequiredSchema,
	emailSchema,
	passwordSchema,
} from "@/lib/validation";
import { publicPaths } from "@/routes/routePaths";
import { authService } from "@/services/authService";
import { ApiError, formatUnknownError } from "@/services/http";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";

type ResetStatus = "form" | "invalid" | "expired";

type ResetPasswordState = {
	confirmPassword: string;
	confirmPasswordError: string | null;
	email: string;
	emailError: string | null;
	password: string;
	passwordError: string | null;
	showPassword: boolean;
	status: ResetStatus;
	submitting: boolean;
};

type ResetPasswordAction =
	| { type: "email"; value: string; error: string | null }
	| {
			type: "password";
			value: string;
			passwordError: string | null;
			confirmPasswordError: string | null;
	  }
	| { type: "confirmPassword"; value: string; error: string | null }
	| { type: "requestError"; error: string | null }
	| {
			type: "confirmErrors";
			password: string | null;
			confirmPassword: string | null;
	  }
	| { type: "togglePassword" }
	| { type: "submitting"; value: boolean }
	| { type: "status"; value: ResetStatus };

const initialState: ResetPasswordState = {
	confirmPassword: "",
	confirmPasswordError: null,
	email: "",
	emailError: null,
	password: "",
	passwordError: null,
	showPassword: false,
	status: "form",
	submitting: false,
};

const resetPasswordSchema = z
	.object({
		password: passwordSchema,
		confirmPassword: confirmPasswordRequiredSchema,
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "login.passwordMismatch",
	});

function readToken(search: string) {
	return new URLSearchParams(search).get("token")?.trim() ?? "";
}

function firstIssueMessage(result: z.ZodSafeParseResult<unknown>) {
	return result.success ? null : (result.error.issues[0]?.message ?? "");
}

function reducer(
	state: ResetPasswordState,
	action: ResetPasswordAction,
): ResetPasswordState {
	switch (action.type) {
		case "email":
			return { ...state, email: action.value, emailError: action.error };
		case "password":
			return {
				...state,
				password: action.value,
				passwordError: action.passwordError,
				confirmPasswordError: action.confirmPasswordError,
			};
		case "confirmPassword":
			return {
				...state,
				confirmPassword: action.value,
				confirmPasswordError: action.error,
			};
		case "requestError":
			return { ...state, emailError: action.error };
		case "confirmErrors":
			return {
				...state,
				passwordError: action.password,
				confirmPasswordError: action.confirmPassword,
			};
		case "togglePassword":
			return { ...state, showPassword: !state.showPassword };
		case "submitting":
			return { ...state, submitting: action.value };
		case "status":
			return { ...state, status: action.value };
	}
}

export default function ResetPasswordPage() {
	const { t } = useTranslation();
	const { search } = useLocation();
	const navigate = useNavigate();
	const branding = useFrontendConfigStore((state) => state.branding);
	const token = readToken(search);
	const [state, dispatch] = useReducer(reducer, initialState);
	const {
		confirmPassword,
		confirmPasswordError,
		email,
		emailError,
		password,
		passwordError,
		showPassword,
		status,
		submitting,
	} = state;
	const isConfirmMode = token.length > 0;
	const brandTitle = branding.title || t("brand.name");

	usePageTitle(
		isConfirmMode ? t("login.resetPasswordTitle") : t("login.forgotPassword"),
	);

	async function submitRequest(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = emailSchema.safeParse(email);
		if (!result.success) {
			dispatch({
				type: "requestError",
				error: result.error.issues[0]?.message ?? "",
			});
			toast.error(t("login.validationFailed"));
			return;
		}

		dispatch({ type: "requestError", error: null });
		dispatch({ type: "submitting", value: true });
		try {
			await authService.requestPasswordReset({ email: result.data });
			toast.success(t("login.passwordResetRequested"));
			navigate(publicPaths.login, { replace: true });
		} catch (error) {
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "submitting", value: false });
		}
	}

	async function submitConfirm(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (status !== "form") return;

		const result = resetPasswordSchema.safeParse({
			password,
			confirmPassword,
		});
		if (!result.success) {
			dispatch({
				type: "confirmErrors",
				password: firstIssueMessage(passwordSchema.safeParse(password)),
				confirmPassword:
					firstIssueMessage(
						confirmPasswordRequiredSchema.safeParse(confirmPassword),
					) ?? (password === confirmPassword ? null : "login.passwordMismatch"),
			});
			toast.error(t("login.validationFailed"));
			return;
		}

		dispatch({
			type: "confirmErrors",
			password: null,
			confirmPassword: null,
		});
		dispatch({ type: "submitting", value: true });
		try {
			await authService.confirmPasswordReset({
				token,
				new_password: result.data.password,
			});
			navigate(`${publicPaths.login}?password_reset=success`, {
				replace: true,
			});
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.code === "auth.contact_verification_invalid") {
					dispatch({ type: "status", value: "invalid" });
					return;
				}
				if (error.code === "auth.contact_verification_expired") {
					dispatch({ type: "status", value: "expired" });
					return;
				}
			}
			toast.error(formatUnknownError(error));
		} finally {
			dispatch({ type: "submitting", value: false });
		}
	}

	const title = isConfirmMode
		? status === "invalid"
			? t("login.resetPasswordInvalidTitle")
			: status === "expired"
				? t("login.resetPasswordExpiredTitle")
				: t("login.resetPasswordTitle")
		: t("login.forgotPassword");
	const description = isConfirmMode
		? status === "invalid"
			? t("login.resetPasswordInvalidDescription")
			: status === "expired"
				? t("login.resetPasswordExpiredDescription")
				: t("login.resetPasswordDescription")
		: t("login.passwordResetRequestDescription");

	return (
		<PublicEntryShell
			branding={branding}
			title={brandTitle}
			tagline={t("brand.tagline")}
			variant="auth"
			hideLanguageOnMobile
		>
			<main className="app-route-transition mx-auto flex w-full max-w-[36rem] flex-1 items-center px-4 py-8 sm:px-8">
				<AuthFormCard title={title} description={description}>
					{isConfirmMode && status !== "form" ? (
						<div className="mt-7 grid gap-3">
							<Button
								type="button"
								className={authPrimaryButtonClassName}
								onClick={() => navigate(publicPaths.login)}
							>
								<Icon name="SignIn" className="size-4" />
								{t("login.backToLogin")}
							</Button>
							<Button
								type="button"
								variant="outline"
								className={authSecondaryButtonClassName}
								onClick={() => navigate(publicPaths.resetPassword)}
							>
								<Icon name="EnvelopeSimple" className="size-4" />
								{t("login.requestNewResetLink")}
							</Button>
						</div>
					) : isConfirmMode ? (
						<form className="mt-7 grid gap-4" onSubmit={submitConfirm}>
							<AuthPasswordField
								id="reset-password"
								label={t("login.password")}
								value={password}
								error={passwordError ? t(passwordError) : undefined}
								showPassword={showPassword}
								autoComplete="new-password"
								placeholder={t("login.passwordPlaceholder")}
								maxLength={128}
								onChange={(value) => {
									dispatch({
										type: "password",
										value,
										passwordError: firstIssueMessage(
											passwordSchema.safeParse(value),
										),
										confirmPasswordError: confirmPassword
											? value === confirmPassword
												? null
												: "login.passwordMismatch"
											: confirmPasswordError,
									});
								}}
								onToggleShowPassword={() =>
									dispatch({ type: "togglePassword" })
								}
							/>
							<AuthPasswordField
								id="reset-confirm-password"
								label={t("login.confirmPassword")}
								value={confirmPassword}
								error={
									confirmPasswordError ? t(confirmPasswordError) : undefined
								}
								showPassword={showPassword}
								autoComplete="new-password"
								placeholder={t("login.confirmPasswordPlaceholder")}
								maxLength={128}
								onChange={(value) => {
									dispatch({
										type: "confirmPassword",
										value,
										error:
											firstIssueMessage(
												confirmPasswordRequiredSchema.safeParse(value),
											) ??
											(value === password ? null : "login.passwordMismatch"),
									});
								}}
							/>
							<Button
								type="submit"
								disabled={
									submitting ||
									!resetPasswordSchema.safeParse({
										password,
										confirmPassword,
									}).success
								}
								className={authPrimaryButtonClassName}
							>
								<Icon
									name={submitting ? "Spinner" : "Key"}
									className={submitting ? "size-4 animate-spin" : "size-4"}
								/>
								{submitting
									? t("login.resetPasswordSubmitting")
									: t("login.resetPasswordSubmit")}
							</Button>
						</form>
					) : (
						<form className="mt-7 grid gap-4" onSubmit={submitRequest}>
							<AuthIconTextField
								id="reset-email"
								label={t("login.email")}
								value={email}
								error={emailError ? t(emailError) : undefined}
								icon="EnvelopeSimple"
								type="email"
								autoComplete="email"
								placeholder={t("login.emailPlaceholder")}
								onChange={(nextEmail) => {
									dispatch({
										type: "email",
										value: nextEmail,
										error: emailError
											? firstIssueMessage(emailSchema.safeParse(nextEmail))
											: emailError,
									});
								}}
							/>
							<Button
								type="submit"
								disabled={submitting || !emailSchema.safeParse(email).success}
								className={authPrimaryButtonClassName}
							>
								<Icon
									name={submitting ? "Spinner" : "EnvelopeSimple"}
									className={submitting ? "size-4 animate-spin" : "size-4"}
								/>
								{submitting
									? t("login.passwordResetRequestSubmitting")
									: t("login.passwordResetRequestSubmit")}
							</Button>
							<p className="text-center text-sm text-slate-700 dark:text-white/78">
								<Link
									to={publicPaths.login}
									className="font-semibold text-emerald-700 underline-offset-4 hover:text-emerald-600 hover:underline dark:text-emerald-300 dark:hover:text-emerald-200"
								>
									{t("login.backToLogin")}
								</Link>
							</p>
						</form>
					)}
				</AuthFormCard>
			</main>
			<LoginEntryFooter brandTitle={brandTitle} />
		</PublicEntryShell>
	);
}

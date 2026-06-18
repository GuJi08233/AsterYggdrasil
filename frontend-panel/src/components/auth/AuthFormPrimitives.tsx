import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const authEntryMainClassName =
	"app-route-transition mx-auto grid w-full max-w-[92rem] flex-1 items-center gap-8 px-4 py-8 sm:px-8 lg:px-12 xl:grid-cols-[minmax(560px,1fr)_minmax(430px,520px)]";

export const authInputClassName =
	"h-12 rounded-lg border-black/10 bg-white/70 text-[#102118] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] [caret-color:#102118] [-webkit-text-fill-color:#102118] placeholder:text-slate-500 focus-visible:border-emerald-700/32 focus-visible:bg-white/82 focus-visible:ring-3 focus-visible:ring-emerald-500/18 dark:border-white/14 dark:bg-neutral-950/42 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:[caret-color:white] dark:[-webkit-text-fill-color:white] dark:placeholder:text-white/42 dark:focus-visible:border-emerald-300/45 dark:focus-visible:bg-neutral-950/52 dark:focus-visible:ring-emerald-400/20 [&:-webkit-autofill]:border-black/10 [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(255,255,255,0.92)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#102118] dark:[&:-webkit-autofill]:border-white/14 dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_rgba(20,28,25,0.98)_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white] dark:[&:-webkit-autofill:focus]:shadow-[0_0_0_1000px_rgba(20,28,25,0.98)_inset]";

export const authPrimaryButtonClassName =
	"h-13 rounded-lg border-0 bg-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-950/25 hover:bg-emerald-400 disabled:bg-emerald-500/55 disabled:text-white/58";

export const authSecondaryButtonClassName =
	"h-12 rounded-lg border-black/10 bg-white/55 text-[#102118] hover:bg-white/78 disabled:text-slate-400 dark:border-white/14 dark:bg-white/3 dark:text-white dark:hover:bg-white/9 dark:disabled:text-white/38";

export function AuthFormCard({
	children,
	className,
	description,
	title,
}: {
	children: ReactNode;
	className?: string;
	description: ReactNode;
	title: string;
}) {
	return (
		<section
			className={cn(
				"auth-card-transition relative mx-auto w-full max-w-[520px] rounded-[1.35rem] border border-black/10 bg-white/78 p-6 shadow-[0_24px_90px_rgba(15,35,25,0.18),0_0_0_1px_rgba(255,255,255,0.52),0_0_58px_rgba(22,163,74,0.10)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:rounded-[1.35rem] before:border before:border-emerald-700/8 dark:border-white/11 dark:bg-neutral-950/70 dark:shadow-[0_24px_90px_rgba(0,0,0,0.42),0_0_0_1px_rgba(120,255,190,0.04),0_0_58px_rgba(82,255,170,0.18)] dark:before:border-emerald-300/9 sm:p-9",
				className,
			)}
		>
			<div>
				<h1 className="text-3xl font-semibold tracking-normal text-[#102118] sm:text-4xl dark:text-white">
					{title}
				</h1>
				<p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/72">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

export function AuthIconTextField({
	autoComplete,
	disabled = false,
	error,
	icon,
	id,
	label,
	maxLength,
	minLength,
	onChange,
	placeholder,
	type = "text",
	value,
}: {
	autoComplete: string;
	disabled?: boolean;
	error?: string;
	icon: IconName;
	id: string;
	label: string;
	maxLength?: number;
	minLength?: number;
	onChange: (value: string) => void;
	placeholder: string;
	type?: ComponentProps<typeof Input>["type"];
	value: string;
}) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={id} className="text-slate-700 dark:text-white/88">
				{label}
			</Label>
			<div className="relative">
				<Icon
					name={icon}
					className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
				/>
				<Input
					id={id}
					type={type}
					value={value}
					onChange={(event) => onChange(event.currentTarget.value)}
					autoComplete={autoComplete}
					disabled={disabled}
					minLength={minLength}
					maxLength={maxLength}
					placeholder={placeholder}
					className={cn(authInputClassName, "pr-4 pl-11")}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? `${id}-error` : undefined}
					required
				/>
			</div>
			<AuthFormFieldError id={`${id}-error`} message={error} />
		</div>
	);
}

export function AuthPasswordField({
	aside,
	autoComplete,
	description,
	disabled = false,
	error,
	id,
	label,
	maxLength,
	onChange,
	onToggleShowPassword,
	placeholder,
	showPassword,
	value,
}: {
	aside?: ReactNode;
	autoComplete: string;
	description?: string;
	disabled?: boolean;
	error?: string;
	id: string;
	label: string;
	maxLength?: number;
	onChange: (value: string) => void;
	onToggleShowPassword?: () => void;
	placeholder: string;
	showPassword: boolean;
	value: string;
}) {
	const { t } = useTranslation();
	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between gap-3">
				<Label htmlFor={id} className="text-slate-700 dark:text-white/88">
					{label}
				</Label>
				{aside}
			</div>
			<div className="relative">
				<Icon
					name="Lock"
					className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-500 dark:text-white/46"
				/>
				<Input
					id={id}
					type={showPassword ? "text" : "password"}
					value={value}
					onChange={(event) => onChange(event.currentTarget.value)}
					autoComplete={autoComplete}
					disabled={disabled}
					placeholder={placeholder}
					maxLength={maxLength}
					className={cn(
						authInputClassName,
						onToggleShowPassword ? "pr-11 pl-11" : "pr-4 pl-11",
					)}
					aria-invalid={Boolean(error)}
					aria-describedby={
						error
							? `${id}-error`
							: description
								? `${id}-description`
								: undefined
					}
					required
				/>
				{onToggleShowPassword ? (
					<button
						type="button"
						className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-transparent text-slate-500 transition-colors outline-none hover:text-slate-800 focus-visible:ring-3 focus-visible:ring-emerald-500/18 dark:text-white/62 dark:hover:text-white dark:focus-visible:ring-emerald-400/20"
						onClick={onToggleShowPassword}
						disabled={disabled}
						aria-label={
							showPassword ? t("login.hidePassword") : t("login.showPassword")
						}
					>
						<Icon name={showPassword ? "EyeSlash" : "Eye"} className="size-4" />
					</button>
				) : null}
			</div>
			{error ? (
				<AuthFormFieldError id={`${id}-error`} message={error} />
			) : description ? (
				<p
					id={`${id}-description`}
					className="text-xs leading-5 text-slate-600 dark:text-white/66"
				>
					{description}
				</p>
			) : null}
		</div>
	);
}

export function AuthFormFieldError({
	id,
	message,
	tone = "plain",
}: {
	id: string;
	message?: string;
	tone?: "plain" | "panel";
}) {
	if (!message) return null;
	return (
		<p
			id={id}
			className={cn(
				"flex items-start gap-2 text-xs leading-5 text-red-700 dark:text-red-300",
				tone === "panel" &&
					"rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100",
			)}
		>
			<Icon
				name="CircleAlert"
				className={cn(
					"mt-0.5 shrink-0",
					tone === "panel" ? "size-4" : "size-3.5",
				)}
			/>
			<span>{message}</span>
		</p>
	);
}

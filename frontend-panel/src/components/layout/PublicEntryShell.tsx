import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { Icon } from "@/components/ui/icon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { AppliedBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

type PublicEntryShellProps = {
	branding: AppliedBranding;
	title: string;
	tagline: string;
	language: string;
	languageLabel: string;
	languageAriaLabel: string;
	languageZhLabel: string;
	languageEnLabel: string;
	onLanguageChange: (language: string) => void;
	variant: "home" | "auth";
	children: ReactNode;
	headerActions?: ReactNode;
	footer?: ReactNode;
	hideLanguageOnMobile?: boolean;
};

export function PublicEntryShell({
	branding,
	title,
	tagline,
	language,
	languageLabel,
	languageAriaLabel,
	languageZhLabel,
	languageEnLabel,
	onLanguageChange,
	variant,
	children,
	headerActions,
	footer,
	hideLanguageOnMobile = false,
}: PublicEntryShellProps) {
	return (
		<div className="relative min-h-dvh bg-[#edf4ed] text-[#102118] dark:bg-[#07110d] dark:text-white">
			<PublicEntryBackdrop variant={variant} />
			<div className="relative z-10 flex min-h-dvh flex-col">
				<header className="mx-auto flex h-20 w-full max-w-[92rem] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
					<Link to="/" className="flex min-w-0 items-center gap-3">
						<BrandMark
							branding={branding}
							className="size-10 shrink-0 object-contain"
							wordmarkClassName="h-10 max-w-52"
						/>
						<span className="min-w-0">
							<span className="block truncate font-semibold text-xl text-[#102118] tracking-normal dark:text-white">
								{title}
							</span>
							<span className="block truncate font-medium text-[0.68rem] text-emerald-700 uppercase tracking-[0.18em] dark:text-emerald-300">
								{tagline}
							</span>
						</span>
					</Link>
					<nav className="flex items-center gap-2">
						<ThemeToggleButton tone="hero" />
						<Select
							value={language}
							onValueChange={(nextLanguage) => {
								if (nextLanguage) onLanguageChange(nextLanguage);
							}}
						>
							<SelectTrigger
								width="fit"
								className={cn(
									"h-10 w-34 rounded-full border-black/10 bg-white/64 px-3 text-[#102118] shadow-lg shadow-black/10 backdrop-blur-md hover:bg-white/80 dark:border-white/12 dark:bg-white/9 dark:text-white dark:hover:bg-white/14",
									hideLanguageOnMobile && "hidden sm:inline-flex",
								)}
								aria-label={languageAriaLabel}
							>
								<Icon name="Globe" className="size-4" />
								<span className="min-w-0 flex-1 truncate text-left">
									{languageLabel}
								</span>
							</SelectTrigger>
							<SelectContent
								align="end"
								alignItemWithTrigger={false}
								className="min-w-48 border-border/70 bg-popover/95 text-popover-foreground shadow-2xl shadow-black/35 ring-white/10 backdrop-blur-xl"
							>
								<SelectItem
									value="zh-CN"
									className="whitespace-nowrap focus:bg-accent focus:text-accent-foreground"
								>
									{languageZhLabel}
								</SelectItem>
								<SelectItem
									value="en-US"
									className="whitespace-nowrap focus:bg-accent focus:text-accent-foreground"
								>
									{languageEnLabel}
								</SelectItem>
							</SelectContent>
						</Select>
						{headerActions}
					</nav>
				</header>
				{children}
			</div>
			{footer ? <div className="relative z-10">{footer}</div> : null}
		</div>
	);
}

function PublicEntryBackdrop({ variant }: { variant: "home" | "auth" }) {
	if (variant === "auth") {
		return (
			<>
				<div
					data-slot="public-entry-backdrop-image"
					className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
					style={{ backgroundImage: "url('/static/images/home.webp')" }}
				/>
				<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_76%_26%,rgba(248,213,154,0.26),transparent_28%),radial-gradient(circle_at_57%_31%,rgba(80,230,150,0.14),transparent_23%),linear-gradient(90deg,rgba(245,250,244,0.96)_0%,rgba(239,247,238,0.82)_38%,rgba(236,244,235,0.58)_68%,rgba(244,235,221,0.52)_100%)] dark:bg-[radial-gradient(circle_at_76%_26%,rgba(248,213,154,0.38),transparent_28%),radial-gradient(circle_at_57%_31%,rgba(80,230,150,0.22),transparent_23%),linear-gradient(90deg,rgba(1,11,12,0.95)_0%,rgba(3,17,18,0.76)_38%,rgba(8,18,16,0.52)_68%,rgba(47,31,17,0.42)_100%)]" />
				<div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(237,244,237,0.42)_100%)] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.42)_100%)]" />
			</>
		);
	}

	return (
		<>
			<div
				data-slot="public-entry-backdrop-image"
				className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
				style={{ backgroundImage: "url('/static/images/home.webp')" }}
			/>
			<div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_70%_16%,rgba(90,191,119,0.16),transparent_25%),linear-gradient(90deg,rgba(245,250,244,0.96)_0%,rgba(239,247,238,0.82)_43%,rgba(236,244,235,0.58)_100%)] dark:bg-[radial-gradient(circle_at_70%_16%,rgba(90,191,119,0.22),transparent_25%),linear-gradient(90deg,rgba(3,8,10,0.94)_0%,rgba(4,11,13,0.78)_43%,rgba(6,18,16,0.50)_100%)]" />
			<div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(237,244,237,0.34)_0%,rgba(237,244,237,0.16)_54%,#edf4ed_100%)] dark:bg-[linear-gradient(180deg,rgba(7,17,13,0.24)_0%,rgba(7,17,13,0.12)_54%,#07110d_100%)]" />
			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-36 bg-gradient-to-t from-[#edf4ed] via-[#edf4ed]/78 to-transparent dark:from-[#07110d] dark:via-[#07110d]/78" />
		</>
	);
}

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthUserMenu } from "@/components/common/AuthUserMenu";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { AppliedBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";
import type { AuthUserInfo } from "@/types/api";

export function ShellTopbar({
	branding,
	isAdminScope,
	mobileSidebarOpen,
	onMobileSidebarToggle,
	onLogout,
	user,
}: {
	branding: AppliedBranding;
	isAdminScope: boolean;
	mobileSidebarOpen: boolean;
	onMobileSidebarToggle: () => void;
	onLogout: () => void;
	user: AuthUserInfo | null;
}) {
	const { t } = useTranslation();
	const mobileSidebarLabel = mobileSidebarOpen
		? t("common.close")
		: t("shell.openNavigation");

	return (
		<header
			className={cn(
				"sticky top-0 z-30 border-b backdrop-blur-xl",
				isAdminScope
					? "border-border/70 bg-background/88"
					: "border-border/60 bg-background/88",
			)}
		>
			<div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-7">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="relative size-10 shrink-0 overflow-hidden rounded-lg border-border/70 bg-card/70 shadow-xs lg:hidden"
					aria-label={mobileSidebarLabel}
					aria-expanded={mobileSidebarOpen}
					aria-controls="shell-mobile-sidebar"
					onClick={onMobileSidebarToggle}
				>
					<span className="relative inline-flex size-5 items-center justify-center">
						<span
							className={cn(
								"absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out motion-reduce:transition-none",
								mobileSidebarOpen
									? "-rotate-90 scale-75 opacity-0"
									: "rotate-0 scale-100 opacity-100",
							)}
						>
							<Icon name="List" className="size-5" />
						</span>
						<span
							className={cn(
								"absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out motion-reduce:transition-none",
								mobileSidebarOpen
									? "rotate-0 scale-100 opacity-100"
									: "rotate-90 scale-75 opacity-0",
							)}
						>
							<Icon name="X" className="size-5" />
						</span>
					</span>
				</Button>
				<Link
					to="/"
					className="group flex min-w-0 items-center gap-3 lg:hidden"
				>
					<BrandMark
						branding={branding}
						className="size-9 shrink-0 object-contain transition-transform group-hover:-translate-y-0.5"
						wordmarkClassName="h-9 max-w-40"
					/>
					<span className="hidden min-w-0 sm:block">
						<span className="block truncate text-sm font-semibold">
							{branding.title || t("brand.name")}
						</span>
					</span>
				</Link>
				<div className="relative hidden min-w-0 flex-1 md:block">
					<Icon
						name="MagnifyingGlass"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						readOnly
						value=""
						placeholder={t("shell.searchPlaceholder")}
						className={cn(
							"h-10 rounded-xl border-border/55 pl-10 shadow-none",
							isAdminScope ? "bg-card/65" : "bg-muted/45",
						)}
					/>
					<span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-xs">
						⌘K
					</span>
				</div>
				<div className="ml-auto flex items-center gap-2">
					<ThemeToggleButton className="inline-flex" />
					<LanguageMenu
						className={cn("h-9", isAdminScope && "bg-card/65")}
						compactOnMobile
					/>
					{user ? (
						<AuthUserMenu
							user={user}
							scope={isAdminScope ? "admin" : "account"}
							onLogout={onLogout}
						/>
					) : null}
				</div>
			</div>
		</header>
	);
}

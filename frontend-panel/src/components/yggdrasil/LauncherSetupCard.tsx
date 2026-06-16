import type { DragEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CopyField } from "@/components/yggdrasil/CopyField";
import { cn } from "@/lib/utils";
import { accountPaths } from "@/routes/routePaths";
import {
	yggdrasilAddServerUri,
	yggdrasilApiRoot,
} from "@/services/yggdrasilService";

type LauncherSetupCardProps = {
	className?: string;
	profileName?: string | null;
	showProfileAction?: boolean;
	showServerOwner?: boolean;
};

export function LauncherSetupCard({
	className,
	profileName,
	showProfileAction = false,
	showServerOwner = false,
}: LauncherSetupCardProps) {
	const { t } = useTranslation();
	const [copiedDragUri, setCopiedDragUri] = useState(false);
	const apiRoot = yggdrasilApiRoot();
	const addServerUri = yggdrasilAddServerUri(apiRoot);
	const serverJvmArg = `-javaagent:authlib-injector.jar=${apiRoot}`;
	const serverCommand = `java ${serverJvmArg} -jar minecraft_server.jar nogui`;

	function handleDragStart(event: DragEvent<HTMLElement>) {
		event.dataTransfer.setData("text/plain", addServerUri);
		event.dataTransfer.dropEffect = "copy";
		event.dataTransfer.effectAllowed = "copy";
	}

	async function copyAddServerUri() {
		await navigator.clipboard.writeText(addServerUri);
		setCopiedDragUri(true);
		window.setTimeout(() => setCopiedDragUri(false), 1200);
	}

	return (
		<section
			className={cn(
				"rounded-xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card/90 dark:shadow-none",
				className,
			)}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="rounded-md">
							authlib-injector
						</Badge>
						{profileName ? (
							<Badge variant="secondary" className="rounded-md">
								{profileName}
							</Badge>
						) : null}
					</div>
					<h2 className="mt-3 text-lg font-semibold">
						{profileName ? t("launcher.profileTitle") : t("launcher.userTitle")}
					</h2>
				</div>
				{showProfileAction ? (
					<Button
						render={<Link to={accountPaths.profiles} />}
						variant="outline"
						className="shrink-0"
					>
						<Icon name="User" className="size-4" />
						{t("launcher.openProfiles")}
					</Button>
				) : null}
			</div>

			<div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<div className="grid gap-3">
					<CopyField label="API Root" value={apiRoot} compact />
					<div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm dark:border-white/10 dark:bg-muted/18">
						<div className="flex items-start gap-3">
							<span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
								<Icon name="SignIn" className="size-4" />
							</span>
							<div className="min-w-0">
								<div className="font-medium">
									{t("launcher.externalLoginName")}
								</div>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
								<Icon name="User" className="size-4" />
							</span>
							<div className="min-w-0">
								<div className="font-medium">
									{profileName
										? t("launcher.selectProfileName", { name: profileName })
										: t("launcher.selectProfile")}
								</div>
							</div>
						</div>
					</div>
				</div>

				<button
					type="button"
					draggable
					onDragStart={handleDragStart}
					onClick={() => void copyAddServerUri()}
					className="group grid min-h-40 cursor-grab select-none content-center gap-3 rounded-lg border border-dashed border-emerald-400/70 bg-emerald-50/70 p-4 text-center text-emerald-900 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-emerald-500 active:cursor-grabbing dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-50"
				>
					<div className="mx-auto grid size-11 place-items-center rounded-lg bg-white text-emerald-700 shadow-xs transition-transform group-hover:scale-105 dark:bg-emerald-950/60 dark:text-emerald-200 dark:shadow-none">
						<Icon
							name={copiedDragUri ? "Check" : "Monitor"}
							className="size-5"
						/>
					</div>
					<div className="font-semibold">
						{copiedDragUri ? t("common.copied") : t("launcher.dragToLauncher")}
					</div>
				</button>
			</div>

			{showServerOwner ? (
				<details className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm dark:border-white/10 dark:bg-muted/18">
					<summary className="cursor-pointer font-medium">
						{t("launcher.serverOwnerTitle")}
					</summary>
					<div className="mt-3 grid gap-3 text-xs leading-5 text-muted-foreground">
						<p>{t("launcher.serverOwnerDescription")}</p>
						<CopyField
							label={t("launcher.jvmArg")}
							value={serverJvmArg}
							compact
						/>
						<CopyField
							label={t("launcher.serverCommand")}
							value={serverCommand}
							compact
						/>
						<p>{t("launcher.serverRequirementSecureProfile")}</p>
					</div>
				</details>
			) : null}
		</section>
	);
}

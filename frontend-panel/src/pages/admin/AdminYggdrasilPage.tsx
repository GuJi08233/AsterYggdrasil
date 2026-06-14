import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AdminTableCell,
	AdminTableHead,
	AdminTableHeader,
	AdminTableRow,
} from "@/components/common/AdminTable";
import { AdminTableList } from "@/components/common/AdminTableList";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { CopyField } from "@/components/yggdrasil/CopyField";
import { usePageTitle } from "@/hooks/usePageTitle";
import { adminConfigService } from "@/services/adminService";
import { frontendConfigService } from "@/services/frontendConfigService";
import { formatUnknownError } from "@/services/http";
import {
	yggdrasilApiRoot,
	yggdrasilService,
} from "@/services/yggdrasilService";
import type {
	PublicFrontendConfig,
	SystemConfig,
	YggdrasilMetadata,
} from "@/types/api";

export default function AdminYggdrasilPage() {
	const { t } = useTranslation();
	const [configs, setConfigs] = useState<SystemConfig[]>([]);

	usePageTitle(t("admin.title"));

	const [metadata, setMetadata] = useState<YggdrasilMetadata | null>(null);
	const [frontendConfig, setFrontendConfig] =
		useState<PublicFrontendConfig | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		Promise.all([
			adminConfigService.list({ limit: 200 }),
			frontendConfigService.get(controller.signal),
			yggdrasilService.metadata(controller.signal),
		])
			.then(([page, nextConfig, nextMetadata]) => {
				setConfigs(
					page.items.filter((item) => item.key.startsWith("yggdrasil_")),
				);
				setFrontendConfig(nextConfig);
				setMetadata(nextMetadata);
			})
			.catch((nextError: unknown) => {
				if (controller.signal.aborted) return;
				toast.error(formatUnknownError(nextError));
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, []);

	const configMap = useMemo(
		() => new Map(configs.map((item) => [item.key, item])),
		[configs],
	);
	const hasPrivateKey = Boolean(
		String(
			configMap.get("yggdrasil_signature_private_key")?.value ?? "",
		).trim(),
	);
	const publicBaseUrls = frontendConfig?.yggdrasil?.public_base_urls ?? [];
	const skinDomains =
		frontendConfig?.yggdrasil?.skin_domains ?? metadata?.skinDomains ?? [];
	const configHeaderRow = useMemo(
		() => (
			<AdminTableHeader>
				<AdminTableRow>
					<AdminTableHead>{t("common.key")}</AdminTableHead>
					<AdminTableHead>{t("common.value")}</AdminTableHead>
					<AdminTableHead>{t("common.source")}</AdminTableHead>
				</AdminTableRow>
			</AdminTableHeader>
		),
		[t],
	);

	return (
		<AdminPageShell>
			<AdminPageHeader
				icon="Shield"
				title={t("admin.title")}
				description={t("admin.description")}
				badge="authlib-injector"
			/>

			<section className="grid gap-3 md:grid-cols-3">
				<StatusTile
					icon="Key"
					title={t("admin.signatureKey")}
					value={
						hasPrivateKey ? t("admin.privateKeyPresent") : t("common.missing")
					}
					ok={hasPrivateKey}
				/>
				<StatusTile
					icon="Shield"
					title={t("admin.publicKey")}
					value={
						metadata?.signaturePublickey
							? t("admin.metadataReady")
							: t("common.missing")
					}
					ok={Boolean(metadata?.signaturePublickey)}
				/>
				<StatusTile
					icon="Globe"
					title={t("admin.skinDomains")}
					value={t("admin.domainRules", {
						count: skinDomains.length,
					})}
					ok={Boolean(skinDomains.length)}
				/>
			</section>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
				<div className="min-w-0">
					<SectionTitle
						icon="Gear"
						title={t("admin.runtimeConfig")}
						description={t("admin.runtimeConfigDescription")}
					/>
					<AdminTableList
						columns={3}
						emptyTitle={t("admin.configPage.noYggdrasilConfig")}
						emptyDescription={t(
							"admin.configPage.noYggdrasilConfigDescription",
						)}
						items={configs}
						loading={loading}
						headerRow={configHeaderRow}
						renderRow={(item) => (
							<AdminTableRow key={item.id}>
								<AdminTableCell className="font-mono text-xs">
									{item.key}
								</AdminTableCell>
								<AdminTableCell className="max-w-[28rem] truncate font-mono text-xs">
									{formatConfigValue(
										item,
										t("admin.sensitivePresent"),
										t("admin.sensitiveEmpty"),
									)}
								</AdminTableCell>
								<AdminTableCell>
									<Badge variant="outline" className="rounded-md">
										{item.source}
									</Badge>
								</AdminTableCell>
							</AdminTableRow>
						)}
					/>
				</div>

				<div className="grid content-start gap-4">
					<AdminSurface className="grid gap-3">
						<SectionTitle
							icon="BracketsCurly"
							title={t("admin.metadata")}
							description={t("admin.metadataDescription")}
							compact
						/>
						<CopyField label={t("home.apiRoot")} value={yggdrasilApiRoot()} />
						<CopyField
							label={t("admin.publicBaseUrls")}
							value={JSON.stringify(publicBaseUrls)}
							compact
						/>
					</AdminSurface>

					<AdminSurface padded={false} className="overflow-hidden">
						<div className="border-b border-border/70 px-4 py-3 dark:border-white/10">
							<SectionTitle
								icon="Globe"
								title={t("home.skinDomains")}
								description={t("admin.skinDomainsDescription")}
								compact
							/>
						</div>
						{skinDomains.length ? (
							<div className="flex flex-wrap gap-1.5 p-4">
								{skinDomains.map((domain) => (
									<Badge key={domain} variant="outline" className="rounded-md">
										{domain}
									</Badge>
								))}
							</div>
						) : (
							<EmptyState
								className="min-h-40"
								title={t("admin.noSkinDomains")}
								description={t("admin.noSkinDomainsDescription")}
								icon={<Icon name="Globe" className="size-5" />}
							/>
						)}
					</AdminSurface>
				</div>
			</div>
		</AdminPageShell>
	);
}

function formatConfigValue(
	item: SystemConfig,
	sensitivePresent: string,
	sensitiveEmpty: string,
) {
	if (item.key.includes("private_key")) {
		return item.value ? sensitivePresent : sensitiveEmpty;
	}
	return JSON.stringify(item.value);
}

function SectionTitle({
	compact = false,
	description,
	icon,
	title,
}: {
	compact?: boolean;
	description?: string;
	icon: IconName;
	title: string;
}) {
	return (
		<div className="flex min-w-0 items-start gap-2.5">
			<span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-muted/40">
				<Icon name={icon} className="size-4" />
			</span>
			<div className="min-w-0">
				<h2
					className={
						compact
							? "text-sm font-semibold text-foreground"
							: "text-base font-semibold text-foreground"
					}
				>
					{title}
				</h2>
				{description ? (
					<p className="mt-1 text-sm leading-6 text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
		</div>
	);
}

function StatusTile({
	icon,
	ok,
	title,
	value,
}: {
	icon: IconName;
	ok: boolean;
	title: string;
	value: string;
}) {
	return (
		<AdminSurface className="flex items-center gap-3">
			<div
				className={
					ok
						? "grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
						: "grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
				}
			>
				<Icon name={icon} className="size-5" />
			</div>
			<div className="min-w-0">
				<div className="text-xs font-medium text-muted-foreground">{title}</div>
				<div className="mt-1 truncate text-sm font-semibold">{value}</div>
			</div>
		</AdminSurface>
	);
}

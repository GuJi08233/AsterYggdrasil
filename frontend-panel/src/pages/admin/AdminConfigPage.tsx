import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	NativeSelectField,
	TextareaField,
	TextField,
} from "@/components/panel/FormControls";
import { JsonPanel } from "@/components/panel/JsonPanel";
import { PageShell } from "@/components/panel/PageShell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAsyncTask } from "@/hooks/useAsyncTask";
import { usePageTitle } from "@/hooks/usePageTitle";
import { parseStringOrStringArray } from "@/lib/form";
import { adminConfigService } from "@/services/adminService";
import type {
	ConfigSchemaItem,
	SystemConfigPage,
	SystemConfigVisibility,
} from "@/types/api";

export default function AdminConfigPage() {
	const { t } = useTranslation();
	const [key, setKey] = useState("");

	usePageTitle(t("admin.configPage.title"));

	const [value, setValue] = useState("");
	const [visibility, setVisibility] =
		useState<SystemConfigVisibility>("private");
	const task = useAsyncTask<unknown>();
	const listTask = useAsyncTask<SystemConfigPage>();
	const schemaTask = useAsyncTask<ConfigSchemaItem[]>();

	useEffect(() => {
		void listTask.run(() => adminConfigService.list());
		void schemaTask.run(() => adminConfigService.schema());
	}, [listTask.run, schemaTask.run]);

	const systemConfigKeys = new Set(
		schemaTask.result?.map((item) => item.key) ??
			listTask.result?.items.flatMap((item) =>
				item.source === "system" ? [item.key] : [],
			) ??
			[],
	);

	return (
		<PageShell
			title={t("admin.configPage.title")}
			description={t("admin.configPage.description")}
		>
			<div className="grid gap-4 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
				<Card>
					<CardHeader className="border-b border-border/60 pb-4">
						<CardTitle className="flex items-center gap-2">
							<Icon name="Gear" className="size-4" />
							{t("admin.configPage.editorTitle")}
						</CardTitle>
						<CardDescription>
							{t("admin.configPage.editorDescription")}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<TextField
							label={t("admin.configPage.configKey")}
							value={key}
							onChange={setKey}
							placeholder="site.title"
						/>
						<TextareaField
							label={t("common.value")}
							value={value}
							onChange={setValue}
							rows={5}
							placeholder={'AsterYggdrasil\nor ["value-a", "value-b"]'}
						/>
						<NativeSelectField
							label={t("admin.configPage.visibility")}
							value={visibility}
							onChange={(next) => setVisibility(next as SystemConfigVisibility)}
							options={[
								{
									label: t("admin.configPage.visibilityPrivate"),
									value: "private",
								},
								{
									label: t("admin.configPage.visibilityAuthenticated"),
									value: "authenticated",
								},
								{
									label: t("admin.configPage.visibilityPublic"),
									value: "public",
								},
							]}
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => void task.run(() => adminConfigService.schema())}
							>
								<Icon name="ListChecks" className="size-4" />
								{t("admin.configPage.schema")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									void listTask.run(() => adminConfigService.list())
								}
							>
								<Icon name="ArrowsClockwise" className="size-4" />
								{t("common.refresh")}
							</Button>
							<Button
								type="button"
								disabled={!key.trim()}
								onClick={() =>
									void task.run(() => adminConfigService.get(key.trim()))
								}
							>
								<Icon name="MagnifyingGlass" className="size-4" />
								{t("admin.configPage.get")}
							</Button>
							<Button
								type="button"
								disabled={!key.trim()}
								onClick={() =>
									void task.run(() =>
										adminConfigService.set(
											key.trim(),
											systemConfigKeys.has(key.trim())
												? { value: parseStringOrStringArray(value) }
												: {
														value: parseStringOrStringArray(value),
														visibility,
													},
										),
									)
								}
							>
								<Icon name="FloppyDisk" className="size-4" />
								{t("admin.configPage.set")}
							</Button>
							<Button
								type="button"
								variant="destructive"
								disabled={!key.trim()}
								onClick={() =>
									void task.run(() => adminConfigService.delete(key.trim()))
								}
							>
								<Icon name="Trash" className="size-4" />
								{t("common.delete")}
							</Button>
						</div>
					</CardContent>
				</Card>
				<JsonPanel
					title={t("admin.configPage.resultTitle")}
					value={task.result}
					error={task.error}
					loading={task.loading}
				/>
			</div>

			<Card>
				<CardHeader className="border-b border-border/60 pb-4">
					<CardTitle>{t("admin.configPage.entriesTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					{listTask.error ? (
						<JsonPanel
							title={t("admin.configPage.listError")}
							value={null}
							error={listTask.error}
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("common.key")}</TableHead>
									<TableHead>{t("admin.configPage.category")}</TableHead>
									<TableHead>{t("admin.configPage.visibility")}</TableHead>
									<TableHead>{t("common.source")}</TableHead>
									<TableHead>{t("common.value")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(listTask.result?.items ?? []).map((item) => (
									<TableRow key={item.id}>
										<TableCell className="font-mono text-xs">
											{item.key}
										</TableCell>
										<TableCell>{item.category}</TableCell>
										<TableCell>{item.visibility}</TableCell>
										<TableCell>{item.source}</TableCell>
										<TableCell className="max-w-96 truncate font-mono text-xs">
											{JSON.stringify(item.value)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}

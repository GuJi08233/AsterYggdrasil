import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminNumberUnitInput } from "@/components/admin/AdminNumberUnitInput";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminPageHeader } from "@/components/layout/AdminPageHeader";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { AdminSurface } from "@/components/layout/AdminSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { NumberUnitOption } from "@/lib/numberUnit";
import { convertNumberUnitValueToBaseUnit } from "@/lib/numberUnit";
import { cn } from "@/lib/utils";
import { adminConfigService } from "@/services/adminService";
import type {
	ConfigSchemaItem,
	SetConfigRequest,
	SystemConfig,
	SystemConfigValue,
} from "@/types/api";

type DraftValue = {
	array: string[];
	arrayRows: DraftArrayRow[];
	text: string;
};

type DraftArrayRow = {
	id: string;
	value: string;
};

type CategoryMeta = {
	descriptionKey: string;
	icon: IconName;
	id: string;
	labelKey: string;
};

type ValidationIssue = {
	key: string;
	message: string;
};

const categoryOrder = [
	"site",
	"auth",
	"network",
	"mail",
	"yggdrasil",
	"runtime",
	"audit",
	"external_auth",
] as const;

const categoryMeta: Record<string, CategoryMeta> = {
	yggdrasil: {
		id: "yggdrasil",
		labelKey: "settings_category_yggdrasil",
		descriptionKey: "settings_category_yggdrasil_desc",
		icon: "Shield",
	},
	auth: {
		id: "auth",
		labelKey: "settings_category_auth",
		descriptionKey: "settings_category_auth_desc",
		icon: "Key",
	},
	external_auth: {
		id: "external_auth",
		labelKey: "settings_category_external_auth",
		descriptionKey: "settings_category_external_auth_desc",
		icon: "SignIn",
	},
	site: {
		id: "site",
		labelKey: "settings_category_site",
		descriptionKey: "settings_category_site_desc",
		icon: "Globe",
	},
	network: {
		id: "network",
		labelKey: "settings_category_network",
		descriptionKey: "settings_category_network_desc",
		icon: "WifiHigh",
	},
	mail: {
		id: "mail",
		labelKey: "settings_category_mail",
		descriptionKey: "settings_category_mail_desc",
		icon: "EnvelopeSimple",
	},
	runtime: {
		id: "runtime",
		labelKey: "settings_category_runtime",
		descriptionKey: "settings_category_runtime_desc",
		icon: "Gauge",
	},
	audit: {
		id: "audit",
		labelKey: "settings_category_audit",
		descriptionKey: "settings_category_audit_desc",
		icon: "ClipboardText",
	},
};

type TimeConfigBaseUnit = "seconds" | "hours" | "days";

type TimeDisplayUnitValue = "seconds" | "minutes" | "hours" | "days" | "weeks";

type TimeDisplayUnit = NumberUnitOption<TimeDisplayUnitValue>;

const timeDisplayUnits: Record<TimeConfigBaseUnit, readonly TimeDisplayUnit[]> =
	{
		seconds: [
			{
				labelKey: "settings_time_unit_days",
				multiplier: 86_400,
				value: "days",
			},
			{
				labelKey: "settings_time_unit_hours",
				multiplier: 3_600,
				value: "hours",
			},
			{
				labelKey: "settings_time_unit_minutes",
				multiplier: 60,
				value: "minutes",
			},
			{
				labelKey: "settings_time_unit_seconds",
				multiplier: 1,
				value: "seconds",
			},
		],
		hours: [
			{ labelKey: "settings_time_unit_days", multiplier: 24, value: "days" },
			{ labelKey: "settings_time_unit_hours", multiplier: 1, value: "hours" },
		],
		days: [
			{ labelKey: "settings_time_unit_weeks", multiplier: 7, value: "weeks" },
			{ labelKey: "settings_time_unit_days", multiplier: 1, value: "days" },
		],
	};

export default function AdminSettingsPage() {
	const { t } = useTranslation();
	const [configs, setConfigs] = useState<SystemConfig[]>([]);

	usePageTitle(t("settings_title"));

	const [schema, setSchema] = useState<ConfigSchemaItem[]>([]);
	const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
	const [activeCategory, setActiveCategory] = useState("site");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedAt, setSavedAt] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		Promise.all([
			adminConfigService.list({ limit: 500 }),
			adminConfigService.schema(),
		])
			.then(([page, nextSchema]) => {
				if (cancelled) return;
				setConfigs(sortConfigs(page.items));
				setSchema(nextSchema);
				setDrafts(
					Object.fromEntries(
						page.items.map((config) => [config.key, configToDraft(config)]),
					),
				);
			})
			.catch((nextError: unknown) => {
				if (cancelled) return;
				toast.error(formatError(nextError));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const schemaMap = useMemo(
		() => new Map(schema.map((item) => [item.key, item])),
		[schema],
	);
	const categories = useMemo(() => {
		const present = new Set(
			configs.map((config) => rootCategory(config.category)),
		);
		return categoryOrder.filter((category) => present.has(category));
	}, [configs]);
	const active = categories.includes(
		activeCategory as (typeof categoryOrder)[number],
	)
		? activeCategory
		: (categories[0] ?? "site");
	const filteredConfigs = useMemo(() => {
		return configs.filter((config) => {
			return rootCategory(config.category) === active;
		});
	}, [active, configs]);
	const groupedConfigs = useMemo(
		() =>
			filteredConfigs.reduce<Record<string, SystemConfig[]>>(
				(groups, config) => {
					groups[config.category] = groups[config.category] ?? [];
					groups[config.category].push(config);
					return groups;
				},
				{},
			),
		[filteredConfigs],
	);
	const changedConfigs = useMemo(
		() =>
			configs.filter((config) => {
				const draft = drafts[config.key];
				return draft ? !draftEqualsConfig(config, draft) : false;
			}),
		[configs, drafts],
	);
	const validationIssues = useMemo(
		() =>
			changedConfigs
				.map((config) =>
					validateDraft(
						config,
						drafts[config.key],
						t("settings_invalid_number"),
					),
				)
				.filter((issue): issue is ValidationIssue => Boolean(issue)),
		[changedConfigs, drafts, t],
	);
	const activeMeta = categoryMeta[active] ?? categoryMeta.site;

	function updateDraft(key: string, draft: DraftValue) {
		setDrafts((current) => ({ ...current, [key]: draft }));
		setSavedAt(null);
		setSaveError(null);
	}

	function discardChanges() {
		setDrafts(
			Object.fromEntries(
				configs.map((config) => [config.key, configToDraft(config)]),
			),
		);
		setSaveError(null);
		setSavedAt(null);
	}

	async function saveChanges() {
		if (validationIssues.length > 0) return;
		setSaving(true);
		setSaveError(null);
		try {
			const updated = await Promise.all(
				changedConfigs.map((config) => {
					const draft = drafts[config.key];
					return adminConfigService.set(
						config.key,
						buildSetConfigRequest(
							config,
							draftToValue(config.value_type, draft),
						),
					);
				}),
			);
			setConfigs((current) =>
				sortConfigs(
					current.map((config) => {
						const next = updated.find((result) => result.key === config.key);
						return next ?? config;
					}),
				),
			);
			setDrafts((current) => {
				const next = { ...current };
				for (const result of updated) {
					next[result.key] = configToDraft(result);
				}
				return next;
			});
			setSavedAt(new Date().toISOString());
		} catch (nextError) {
			setSaveError(formatError(nextError));
		} finally {
			setSaving(false);
		}
	}

	return (
		<AdminPageShell className="gap-5">
			<AdminPageHeader
				icon="Gear"
				title={t("settings_title")}
				description={t("settings_intro")}
				badge={t("settings_badge")}
				actions={
					<SettingsActions
						changedCount={changedConfigs.length}
						disabled={validationIssues.length > 0}
						savedAt={savedAt}
						saving={saving}
						onDiscard={discardChanges}
						onSave={() => void saveChanges()}
					/>
				}
			/>

			<div className="grid gap-5 xl:grid-cols-[16.5rem_minmax(0,1fr)]">
				<aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
					<AdminSurface padded={false} className="overflow-hidden">
						<div className="border-b border-border/70 px-4 py-3 dark:border-white/10">
							<div className="text-sm font-semibold">
								{t("settings_navigation")}
							</div>
							<div className="mt-1 text-xs text-muted-foreground">
								{t("settings_navigation_desc")}
							</div>
						</div>
						<nav className="grid gap-1 p-2">
							{categories.map((category) => (
								<CategoryButton
									key={category}
									active={category === active}
									category={category}
									count={
										configs.filter(
											(config) => rootCategory(config.category) === category,
										).length
									}
									onClick={() => setActiveCategory(category)}
								/>
							))}
						</nav>
					</AdminSurface>
				</aside>

				<section className="min-w-0">
					{loading ? (
						<SettingsSkeleton />
					) : filteredConfigs.length === 0 ? (
						<AdminSurface padded={false}>
							<EmptyState
								title={t("settings_empty_title")}
								description={t("settings_empty_desc")}
								icon={<Icon name="Gear" className="size-5" />}
							/>
						</AdminSurface>
					) : (
						<div className="grid gap-4">
							<AdminSurface className="flex items-start gap-3">
								<div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
									<Icon name={activeMeta.icon} className="size-5" />
								</div>
								<div className="min-w-0">
									<h2 className="text-base font-semibold">
										{t(activeMeta.labelKey)}
									</h2>
									<p className="mt-1 text-sm leading-6 text-muted-foreground">
										{t(activeMeta.descriptionKey)}
									</p>
								</div>
							</AdminSurface>
							{Object.entries(groupedConfigs).map(([category, items]) => (
								<SettingsGroup
									key={category}
									category={category}
									configs={items}
									drafts={drafts}
									schemaMap={schemaMap}
									onChange={updateDraft}
								/>
							))}
						</div>
					)}
				</section>
			</div>

			<SettingsSaveBar
				changedCount={changedConfigs.length}
				disabled={validationIssues.length > 0}
				error={saveError ?? validationIssues[0]?.message ?? null}
				hasUnsavedChanges={changedConfigs.length > 0}
				saving={saving}
				onDiscard={discardChanges}
				onSave={() => void saveChanges()}
			/>
		</AdminPageShell>
	);
}

function SettingsActions({
	changedCount,
	disabled,
	onDiscard,
	onSave,
	savedAt,
	saving,
}: {
	changedCount: number;
	disabled: boolean;
	onDiscard: () => void;
	onSave: () => void;
	savedAt: string | null;
	saving: boolean;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap items-center gap-2">
			{savedAt ? (
				<span className="text-xs text-muted-foreground">
					{t("settings_saved_at", {
						time: new Date(savedAt).toLocaleTimeString(),
					})}
				</span>
			) : null}
			<Button
				type="button"
				variant="outline"
				disabled={!changedCount || saving}
				onClick={onDiscard}
			>
				<Icon name="Undo" className="size-4" />
				{t("undo_changes")}
			</Button>
			<Button
				type="button"
				disabled={!changedCount || disabled || saving}
				onClick={onSave}
			>
				<Icon
					name={saving ? "Spinner" : "FloppyDisk"}
					className={cn("size-4", saving && "animate-spin")}
				/>
				{t("save_changes")}
			</Button>
		</div>
	);
}

function SettingsGroup({
	category,
	configs,
	drafts,
	onChange,
	schemaMap,
}: {
	category: string;
	configs: SystemConfig[];
	drafts: Record<string, DraftValue>;
	onChange: (key: string, draft: DraftValue) => void;
	schemaMap: Map<string, ConfigSchemaItem>;
}) {
	const { t } = useTranslation();
	const root = rootCategory(category);

	return (
		<AdminSurface padded={false} className="overflow-hidden">
			<div className="border-b border-border/70 px-4 py-3 dark:border-white/10">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-sm font-semibold">
						{formatSubcategoryLabel(root, category, t)}
					</h3>
					<Badge variant="outline" className="rounded-md">
						{configs.length}
					</Badge>
				</div>
				<p className="mt-1 text-sm leading-6 text-muted-foreground">
					{formatSubcategoryDescription(root, category, t)}
				</p>
			</div>
			<div className="divide-y divide-border/70 dark:divide-white/10">
				{configs.map((config) => (
					<SettingRow
						key={config.key}
						config={config}
						draft={drafts[config.key] ?? configToDraft(config)}
						schema={schemaMap.get(config.key)}
						onChange={(draft) => onChange(config.key, draft)}
					/>
				))}
			</div>
		</AdminSurface>
	);
}

function SettingRow({
	config,
	draft,
	onChange,
	schema,
}: {
	config: SystemConfig;
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
	schema?: ConfigSchemaItem;
}) {
	const { t } = useTranslation();
	const label = translateOrFallback(
		t,
		schema?.label_i18n_key,
		humanizeKey(config.key),
	);
	const description = translateOrFallback(
		t,
		schema?.description_i18n_key,
		config.description,
	);
	const changed = !draftEqualsConfig(config, draft);

	return (
		<div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1fr)] lg:items-start">
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<Label className="text-sm font-semibold">{label}</Label>
					<SettingDescriptionHelp
						description={description}
						label={t("settings_config_description_help", { label })}
					/>
					{changed ? (
						<Badge variant="secondary" className="rounded-md">
							{t("settings_status_unsaved")}
						</Badge>
					) : null}
					{config.is_sensitive ? (
						<Badge variant="outline" className="rounded-md">
							{t("settings_status_sensitive")}
						</Badge>
					) : null}
					{config.requires_restart ? (
						<Badge variant="outline" className="rounded-md">
							{t("requires_restart")}
						</Badge>
					) : null}
				</div>
			</div>
			<div className="min-w-0">
				<SettingControl
					config={config}
					draft={draft}
					schema={schema}
					onChange={onChange}
				/>
			</div>
		</div>
	);
}

function SettingDescriptionHelp({
	description,
	label,
}: {
	description: string;
	label: string;
}) {
	if (!description.trim()) return null;

	return (
		<TooltipProvider delay={0}>
			<Tooltip>
				<TooltipTrigger
					type="button"
					aria-label={label}
					className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
				>
					<Icon name="Info" className="size-4" aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent
					side="top"
					align="start"
					className="max-w-[min(24rem,calc(100vw-2rem))] whitespace-normal break-words leading-5"
				>
					{description}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function SettingControl({
	config,
	draft,
	onChange,
	schema,
}: {
	config: SystemConfig;
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
	schema?: ConfigSchemaItem;
}) {
	const { t } = useTranslation();
	if (config.value_type === "boolean") {
		return <BooleanControl draft={draft} onChange={onChange} />;
	}
	if (config.value_type === "number") {
		return <NumberControl config={config} draft={draft} onChange={onChange} />;
	}
	if (config.value_type === "string_enum_set") {
		return (
			<EnumSetControl
				draft={draft}
				options={schema?.options ?? []}
				onChange={onChange}
			/>
		);
	}
	if (config.value_type === "string_array") {
		return (
			<StringArrayControl
				draft={draft}
				options={schema?.options ?? []}
				onChange={onChange}
			/>
		);
	}
	if (config.value_type === "multiline") {
		return (
			<CodeTextControl
				config={config}
				draft={draft}
				language={editorLanguage(config)}
				onChange={onChange}
			/>
		);
	}
	return (
		<Input
			type={config.is_sensitive ? "password" : "text"}
			value={draft.text}
			placeholder={
				config.is_sensitive ? t("settings_sensitive_keep_placeholder") : ""
			}
			onChange={(event) =>
				onChange({ ...draft, text: event.currentTarget.value })
			}
			className={config.is_sensitive ? "font-mono" : undefined}
		/>
	);
}

function BooleanControl({
	draft,
	onChange,
}: {
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
}) {
	const { t } = useTranslation();
	const checked = draft.text === "true";
	return (
		<div className="flex items-center gap-3">
			<Switch
				checked={checked}
				onCheckedChange={(nextChecked) =>
					onChange({ ...draft, text: nextChecked ? "true" : "false" })
				}
			/>
			<span className="text-sm text-muted-foreground">
				{checked ? t("settings_value_on") : t("settings_value_off")}
			</span>
		</div>
	);
}

function NumberControl({
	config,
	draft,
	onChange,
}: {
	config: SystemConfig;
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
}) {
	const { t } = useTranslation();
	const baseUnit = getTimeConfigBaseUnit(config);
	const units = baseUnit ? timeDisplayUnits[baseUnit] : null;
	const [displayUnits, setDisplayUnits] = useState<
		Partial<Record<string, TimeDisplayUnitValue>>
	>({});

	if (!units) {
		return (
			<Input
				type="number"
				inputMode="numeric"
				min={0}
				step={1}
				value={draft.text}
				onChange={(event) =>
					onChange({ ...draft, text: event.currentTarget.value })
				}
			/>
		);
	}

	const availableUnits = getAvailableDisplayUnits(units, draft.text);
	const preferredUnit = getPreferredDisplayUnit(units, draft.text);
	const selectedUnit =
		availableUnits.find((unit) => unit.value === displayUnits[config.key]) ??
		preferredUnit;
	const displayValue = formatDisplayValue(draft.text, selectedUnit);

	function updateFromDisplayValue(value: string) {
		const nextDisplayValue = value.trim();
		if (!nextDisplayValue) {
			setDisplayUnits((previous) => ({
				...previous,
				[config.key]: selectedUnit.value,
			}));
			onChange({ ...draft, text: "" });
			return;
		}

		const nextValue = convertNumberUnitValueToBaseUnit(
			nextDisplayValue,
			selectedUnit,
		);
		if (nextValue === null) {
			setDisplayUnits((previous) => ({
				...previous,
				[config.key]: selectedUnit.value,
			}));
			onChange({ ...draft, text: nextDisplayValue });
			return;
		}

		onChange({ ...draft, text: String(nextValue) });
	}

	return (
		<AdminNumberUnitInput
			value={displayValue}
			unit={selectedUnit.value}
			units={availableUnits}
			placeholder={t("common.value")}
			unitAriaLabel={t("settings_time_unit_label")}
			onValueChange={updateFromDisplayValue}
			onUnitChange={(value) => {
				setDisplayUnits((previous) => ({
					...previous,
					[config.key]: value,
				}));
			}}
		/>
	);
}

function EnumSetControl({
	draft,
	onChange,
	options,
}: {
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
	options: NonNullable<ConfigSchemaItem["options"]>;
}) {
	const { t } = useTranslation();
	const [filter, setFilter] = useState("");
	const selected = new Set(draft.array);
	const visibleOptions = options.filter((option) =>
		`${option.value} ${translateOrFallback(t, option.label_i18n_key, option.value)}`
			.toLowerCase()
			.includes(filter.trim().toLowerCase()),
	);

	return (
		<div className="grid gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<Input
					value={filter}
					onChange={(event) => setFilter(event.currentTarget.value)}
					placeholder={t("settings_enum_set_search_placeholder")}
					className="max-w-72"
				/>
				<span className="text-xs text-muted-foreground">
					{t("settings_enum_set_selected_count", {
						count: selected.size,
						total: options.length,
					})}
				</span>
			</div>
			<div className="flex max-h-72 flex-wrap gap-2 overflow-auto rounded-lg border border-border/70 bg-muted/15 p-2 dark:border-white/10">
				{visibleOptions.map((option) => {
					const active = selected.has(option.value);
					return (
						<Button
							key={option.value}
							type="button"
							variant={active ? "default" : "outline"}
							size="xs"
							onClick={() => {
								const next = new Set(selected);
								if (active) next.delete(option.value);
								else next.add(option.value);
								onChange({ ...draft, array: Array.from(next).sort() });
							}}
							className={cn(
								"max-w-full whitespace-normal",
								active
									? "dark:border-emerald-400/40 dark:bg-emerald-400/20 dark:text-emerald-100"
									: "text-muted-foreground",
							)}
						>
							{translateOrFallback(t, option.label_i18n_key, option.value)}
						</Button>
					);
				})}
			</div>
		</div>
	);
}

function StringArrayControl({
	draft,
	onChange,
	options,
}: {
	draft: DraftValue;
	onChange: (draft: DraftValue) => void;
	options: NonNullable<ConfigSchemaItem["options"]>;
}) {
	const { t } = useTranslation();
	if (options.length > 0) {
		return (
			<EnumSetControl draft={draft} options={options} onChange={onChange} />
		);
	}
	return (
		<div className="grid gap-2">
			{draft.arrayRows.map((row, index) => (
				<div key={row.id} className="flex gap-2">
					<Input
						value={row.value}
						onChange={(event) => {
							const value = event.currentTarget.value;
							const arrayRows = draft.arrayRows.map((item, itemIndex) =>
								itemIndex === index ? { ...item, value } : item,
							);
							onChange({
								...draft,
								array: arrayRows.flatMap((item) => {
									const nextValue = item.value.trim();
									return nextValue ? [nextValue] : [];
								}),
								arrayRows,
							});
						}}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={() =>
							onChange({
								...draft,
								array: draft.arrayRows.flatMap((item, itemIndex) => {
									if (itemIndex === index) return [];
									const nextValue = item.value.trim();
									return nextValue ? [nextValue] : [];
								}),
								arrayRows: draft.arrayRows.filter(
									(_, itemIndex) => itemIndex !== index,
								),
							})
						}
						aria-label={t("settings_string_array_remove_item")}
					>
						<Icon name="X" className="size-4" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit"
				onClick={() => {
					const arrayRows = [...draft.arrayRows, createDraftArrayRow("")];
					onChange({
						...draft,
						array: arrayRows.map((item) => item.value),
						arrayRows,
					});
				}}
			>
				<Icon name="Plus" className="size-4" />
				{t("settings_string_array_add_item")}
			</Button>
		</div>
	);
}

function CodeTextControl({
	config,
	draft,
	language,
	onChange,
}: {
	config: SystemConfig;
	draft: DraftValue;
	language: string;
	onChange: (draft: DraftValue) => void;
}) {
	const { t } = useTranslation();
	const lines = Math.max(6, draft.text.split("\n").length);
	const lineNumbers = useMemo(
		() => Array.from({ length: lines }, (_, index) => index + 1),
		[lines],
	);
	return (
		<div className="overflow-hidden rounded-lg border border-border/70 bg-background dark:border-white/10">
			<div className="flex items-center justify-between border-b border-border/70 bg-muted/35 px-3 py-2 dark:border-white/10">
				<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
					<Icon name="FileCode" className="size-4" />
					{language.toUpperCase()}
				</div>
				{config.is_sensitive ? (
					<span className="text-xs text-muted-foreground">
						{t("settings_sensitive_keep_placeholder")}
					</span>
				) : null}
			</div>
			<div className="grid grid-cols-[3rem_minmax(0,1fr)]">
				<div className="select-none border-r border-border/70 bg-muted/20 py-2 text-right font-mono text-xs leading-5 text-muted-foreground dark:border-white/10">
					{lineNumbers.map((lineNumber) => (
						<div key={`line-${lineNumber}`} className="px-2">
							{lineNumber}
						</div>
					))}
				</div>
				<Textarea
					value={draft.text}
					rows={Math.min(18, Math.max(6, lines))}
					placeholder={
						config.is_sensitive ? t("settings_sensitive_keep_placeholder") : ""
					}
					onChange={(event) =>
						onChange({ ...draft, text: event.currentTarget.value })
					}
					className="min-h-40 resize-y rounded-none border-0 bg-transparent font-mono text-xs leading-5 shadow-none focus-visible:ring-0"
				/>
			</div>
		</div>
	);
}

function CategoryButton({
	active,
	category,
	count,
	onClick,
}: {
	active: boolean;
	category: string;
	count: number;
	onClick: () => void;
}) {
	const { t } = useTranslation();
	const meta = categoryMeta[category] ?? {
		descriptionKey: "settings_category_other_desc",
		icon: "Grid" as IconName,
		id: category,
		labelKey: "settings_category_other",
	};
	return (
		<Button
			type="button"
			variant={active ? "default" : "ghost"}
			onClick={onClick}
			className={cn(
				"h-auto w-full justify-start whitespace-normal px-3 py-2.5 text-left",
				active
					? "bg-emerald-600 text-white dark:bg-emerald-500/18 dark:text-emerald-100"
					: "text-muted-foreground",
			)}
		>
			<Icon name={meta.icon} className="mt-0.5 size-4 shrink-0" />
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold">
					{t(meta.labelKey)}
				</span>
				<span className="mt-0.5 block text-xs opacity-75">
					{t(meta.descriptionKey)}
				</span>
			</span>
			<span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold text-foreground dark:bg-white/12 dark:text-current">
				{count}
			</span>
		</Button>
	);
}

function SettingsSaveBar({
	changedCount,
	disabled,
	error,
	hasUnsavedChanges,
	onDiscard,
	onSave,
	saving,
}: {
	changedCount: number;
	disabled: boolean;
	error: string | null;
	hasUnsavedChanges: boolean;
	onDiscard: () => void;
	onSave: () => void;
	saving: boolean;
}) {
	const { t } = useTranslation();
	if (!hasUnsavedChanges && !error) return null;

	const actionsDisabled = saving || !hasUnsavedChanges;

	return (
		<div className="pointer-events-none sticky bottom-4 z-20">
			<div className="pointer-events-auto mx-auto w-full max-w-4xl origin-bottom animate-in fade-in-0 slide-in-from-bottom-2 duration-150 motion-reduce:animate-none">
				<AdminSurface
					className={cn(
						"flex flex-col gap-3 bg-background/95 shadow-2xl shadow-black/10 ring-1 backdrop-blur-xl dark:bg-card/95 dark:shadow-none sm:flex-row sm:items-center sm:justify-between",
						error
							? "border-destructive/40 ring-destructive/10"
							: "border-emerald-500/35 ring-border/50",
					)}
				>
					<div className="min-w-0">
						<div className="text-sm font-semibold">
							{error
								? t("settings_save_failed")
								: t("settings_save_notice", {
										count: changedCount,
									})}
						</div>
						<p
							className={cn(
								"mt-1 text-xs text-muted-foreground",
								error && "text-destructive",
							)}
						>
							{error ?? t("settings_save_hint")}
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={actionsDisabled}
							onClick={onDiscard}
						>
							{t("undo_changes")}
						</Button>
						<Button
							type="button"
							disabled={actionsDisabled || disabled}
							onClick={onSave}
						>
							<Icon
								name={saving ? "Spinner" : "FloppyDisk"}
								className={cn("size-4", saving && "animate-spin")}
							/>
							{t("save_changes")}
						</Button>
					</div>
				</AdminSurface>
			</div>
		</div>
	);
}

function SettingsSkeleton() {
	return (
		<div className="grid gap-4">
			{Array.from(
				{ length: 4 },
				(_, index) => `settings-skeleton-${index}`,
			).map((key) => (
				<AdminSurface key={key}>
					<div className="h-4 w-40 rounded bg-muted" />
					<div className="mt-4 grid gap-3">
						<div className="h-8 rounded bg-muted/70" />
						<div className="h-8 rounded bg-muted/70" />
					</div>
				</AdminSurface>
			))}
		</div>
	);
}

function sortConfigs(configs: SystemConfig[]) {
	return configs.toSorted((left, right) => {
		const leftRoot = rootCategory(left.category);
		const rightRoot = rootCategory(right.category);
		const leftIndex = categoryOrder.indexOf(
			leftRoot as (typeof categoryOrder)[number],
		);
		const rightIndex = categoryOrder.indexOf(
			rightRoot as (typeof categoryOrder)[number],
		);
		return (
			(leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
				(rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex) ||
			left.category.localeCompare(right.category) ||
			left.key.localeCompare(right.key)
		);
	});
}

function rootCategory(category: string) {
	const [root] = category.split(".");
	return root || "other";
}

function buildSetConfigRequest(
	config: SystemConfig,
	value: SystemConfigValue,
): SetConfigRequest {
	if (config.source === "custom") {
		return { value, visibility: config.visibility };
	}

	return { value };
}

function getTimeConfigBaseUnit(
	config: SystemConfig,
): TimeConfigBaseUnit | null {
	if (config.value_type !== "number") return null;
	if (config.key.endsWith("_secs")) return "seconds";
	if (config.key.endsWith("_hours")) return "hours";
	if (config.key.endsWith("_days")) return "days";
	return null;
}

function parseWholeNumber(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (!/^-?\d+$/.test(trimmed)) return null;

	const parsed = Number(trimmed);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

function getAvailableDisplayUnits<T extends TimeDisplayUnit>(
	units: readonly T[],
	_value: string,
) {
	return units;
}

function getPreferredDisplayUnit<T extends TimeDisplayUnit>(
	units: readonly T[],
	value: string,
) {
	if (!value.trim()) return units[units.length - 1];

	const parsed = parseWholeNumber(value);
	if (parsed === 0) return units[units.length - 1];
	if (parsed === null) return units[units.length - 1];

	return (
		units.find(
			(unit) => unit.multiplier === 1 || parsed % unit.multiplier === 0,
		) ?? units[units.length - 1]
	);
}

function formatDisplayValue(value: string, unit: TimeDisplayUnit) {
	if (!value.trim()) return "";

	const parsed = parseWholeNumber(value);
	if (parsed === null) return value;

	return String(parsed / unit.multiplier);
}

function configToDraft(config: SystemConfig): DraftValue {
	if (config.is_sensitive) {
		return { text: "", array: [], arrayRows: [] };
	}
	if (Array.isArray(config.value)) {
		return {
			text: config.value.join("\n"),
			array: config.value,
			arrayRows: config.value.map(createDraftArrayRow),
		};
	}
	return { text: config.value ?? "", array: [], arrayRows: [] };
}

function draftEqualsConfig(config: SystemConfig, draft: DraftValue) {
	if (config.is_sensitive && draft.text === "" && draft.array.length === 0) {
		return true;
	}
	const current = normalizeConfigValue(config.value_type, config.value);
	const next = normalizeConfigValue(
		config.value_type,
		draftToValue(config.value_type, draft),
	);
	return JSON.stringify(current) === JSON.stringify(next);
}

function draftToValue(
	valueType: SystemConfig["value_type"],
	draft: DraftValue | undefined,
): SystemConfigValue {
	if (valueType === "string_array" || valueType === "string_enum_set") {
		return compactTrimmedStrings(draft?.array ?? []);
	}
	if (valueType === "boolean") {
		return draft?.text === "true" ? "true" : "false";
	}
	return draft?.text ?? "";
}

function normalizeConfigValue(
	valueType: SystemConfig["value_type"],
	value: SystemConfigValue,
) {
	if (valueType === "string_array" || valueType === "string_enum_set") {
		return Array.isArray(value)
			? compactTrimmedStrings(value)
			: compactTrimmedStrings(String(value).split("\n"));
	}
	if (valueType === "boolean") {
		return String(value) === "true" ? "true" : "false";
	}
	return String(value ?? "");
}

function compactTrimmedStrings(values: string[]) {
	return values.flatMap((item) => {
		const value = item.trim();
		return value ? [value] : [];
	});
}

function createDraftArrayRow(value: string): DraftArrayRow {
	return {
		id:
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `draft-array-row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
		value,
	};
}

function validateDraft(
	config: SystemConfig,
	draft: DraftValue | undefined,
	invalidNumberMessage: string,
): ValidationIssue | null {
	if (!draft || (config.is_sensitive && draft.text.trim() === "")) return null;
	if (config.value_type === "number" && !Number.isFinite(Number(draft.text))) {
		return {
			key: config.key,
			message: `${humanizeKey(config.key)}: ${invalidNumberMessage}`,
		};
	}
	return null;
}

function translateOrFallback(
	t: (key: string, options?: Record<string, unknown>) => string,
	key: string | undefined,
	fallback: string,
) {
	if (!key) return fallback;
	const translated = t(key);
	return translated === key ? fallback : translated;
}

function humanizeKey(key: string) {
	return key
		.split(/[._-]+/)
		.filter(Boolean)
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join(" ");
}

function formatSubcategoryLabel(
	root: string,
	category: string,
	t: (key: string, options?: Record<string, unknown>) => string,
) {
	return translateOrFallback(
		t,
		`settings_subcategory_${category.replaceAll(".", "_")}`,
		category === root
			? t(categoryMeta[root]?.labelKey ?? "settings_category_other")
			: humanizeKey(category),
	);
}

function formatSubcategoryDescription(
	root: string,
	category: string,
	t: (key: string, options?: Record<string, unknown>) => string,
) {
	return translateOrFallback(
		t,
		`settings_subcategory_${category.replaceAll(".", "_")}_desc`,
		category === root
			? t(categoryMeta[root]?.descriptionKey ?? "settings_category_other_desc")
			: "",
	);
}

function editorLanguage(config: SystemConfig) {
	if (config.key.endsWith("_html")) return "html";
	if (config.key.endsWith("_json")) return "json";
	if (config.key.includes("private_key") || config.key.includes("public_key")) {
		return "pem";
	}
	return "text";
}

function formatError(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

import { type FormEvent, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTextureWardrobePageState } from "@/components/account/wardrobe-page/useTextureWardrobePageState";
import { Field, NativeSelectField } from "@/components/common/FormControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StaticSkinPreview } from "@/components/yggdrasil/StaticSkinPreview";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { formatUnknownError } from "@/services/http";
import { yggdrasilService } from "@/services/yggdrasilService";
import type {
	MinecraftTextureModel,
	MinecraftTextureType,
	MinecraftWardrobeTextureMetadata,
} from "@/types/api";

export default function TextureWardrobePage() {
	const { t, i18n } = useTranslation();
	const [state, dispatch] = useTextureWardrobePageState();
	const {
		activeTexture,
		deleteDialogOpen,
		deleteTexture,
		dialogOpen,
		file,
		loading,
		model,
		profileQuery,
		profiles,
		query,
		selectedProfileId,
		submitting,
		textures,
		textureType,
	} = state;

	usePageTitle(t("wardrobe.title"));

	const loadData = useCallback(async () => {
		dispatch({ type: "loading", value: true });
		try {
			const [nextProfiles, nextTextures] = await Promise.all([
				yggdrasilService.listProfiles(),
				yggdrasilService.listWardrobeTextures(),
			]);
			dispatch({
				type: "loadSuccess",
				profiles: nextProfiles,
				textures: nextTextures,
			});
		} catch (nextError) {
			const errorMessage = formatUnknownError(nextError);
			toast.error(errorMessage);
			dispatch({ type: "loading", value: false });
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}, [dispatch]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const filteredTextures = useMemo(() => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return textures;
		return textures.filter(
			(texture) =>
				texture.hash.toLowerCase().includes(trimmed) ||
				texture.texture_type.includes(trimmed) ||
				texture.texture_model.includes(trimmed),
		);
	}, [textures, query]);

	const filteredProfiles = useMemo(() => {
		const trimmed = profileQuery.trim().toLowerCase();
		if (!trimmed) return profiles;
		return profiles.filter(
			(profile) =>
				profile.name.toLowerCase().includes(trimmed) ||
				profile.id.toLowerCase().includes(trimmed),
		);
	}, [profiles, profileQuery]);

	async function uploadTexture(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!file) return;
		dispatch({ type: "submitting", value: true });
		try {
			const uploaded = await yggdrasilService.uploadWardrobeTexture({
				textureType,
				model,
				file,
			});
			dispatch({ type: "prependTexture", value: uploaded });
			dispatch({ type: "file", value: null });
			toast.success(t("wardrobe.uploadSuccess"));
		} catch (nextError) {
			const errorMessage = formatUnknownError(nextError);
			toast.error(errorMessage);
		} finally {
			dispatch({ type: "submitting", value: false });
		}
	}

	function openBindDialog(texture: MinecraftWardrobeTextureMetadata) {
		dispatch({ type: "activeTexture", value: texture });
		dispatch({
			type: "selectedProfileId",
			value: (current) => current || profiles[0]?.id || "",
		});
		dispatch({ type: "dialogOpen", value: true });
	}

	async function bindTexture() {
		if (!activeTexture || !selectedProfileId) return;
		dispatch({ type: "submitting", value: true });
		try {
			await yggdrasilService.bindProfileTexture({
				uuid: selectedProfileId,
				textureType: activeTexture.texture_type,
				textureId: activeTexture.id,
			});
			const profile = profiles.find((item) => item.id === selectedProfileId);
			toast.success(
				t("wardrobe.bindSuccess", {
					name: profile?.name ?? selectedProfileId,
				}),
			);
			dispatch({ type: "dialogOpen", value: false });
		} catch (nextError) {
			const errorMessage = formatUnknownError(nextError);
			toast.error(errorMessage);
		} finally {
			dispatch({ type: "submitting", value: false });
		}
	}

	function openDeleteDialog(texture: MinecraftWardrobeTextureMetadata) {
		dispatch({ type: "deleteTexture", value: texture });
		dispatch({ type: "deleteDialogOpen", value: true });
	}

	async function deleteWardrobeTexture() {
		if (!deleteTexture) return;
		dispatch({ type: "submitting", value: true });
		try {
			await yggdrasilService.deleteWardrobeTexture(deleteTexture.id);
			dispatch({ type: "removeTexture", id: deleteTexture.id });
			toast.success(t("wardrobe.deleteSuccess"));
			dispatch({ type: "deleteDialogOpen", value: false });
		} catch (nextError) {
			const errorMessage = formatUnknownError(nextError);
			toast.error(errorMessage);
		} finally {
			dispatch({ type: "submitting", value: false });
		}
	}

	const formatter = useMemo(
		() => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }),
		[i18n.language],
	);

	return (
		<div className="mx-auto grid w-full max-w-[92rem] gap-4 px-4 py-5 sm:px-6 lg:px-7">
			<section className="rounded-lg border border-border/70 bg-card/90 shadow-xs">
				<div className="flex flex-col gap-4 border-b border-border/70 p-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="rounded-md">
								{t("nav.wardrobe")}
							</Badge>
							<Badge variant="secondary" className="rounded-md">
								{t("wardrobe.totalTextures", {
									count: textures.length.toString(),
								})}
							</Badge>
						</div>
						<h1 className="mt-3 text-2xl font-semibold tracking-normal">
							{t("wardrobe.title")}
						</h1>
						<p className="mt-2 max-w-3xl text-sm text-muted-foreground">
							{t("wardrobe.description")}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void loadData()}
						disabled={loading || submitting}
					>
						<Icon
							name={loading ? "Spinner" : "ArrowClockwise"}
							className="size-4"
						/>
						{t("common.refresh")}
					</Button>
				</div>

				<div className="grid gap-4 p-4 lg:grid-cols-[minmax(320px,0.34fr)_minmax(0,0.66fr)]">
					<form
						className="grid content-start gap-4 rounded-lg border border-border/70 bg-muted/20 p-4"
						onSubmit={uploadTexture}
					>
						<div>
							<div className="flex items-center gap-2 text-sm font-semibold">
								<Icon name="Upload" className="size-4" />
								{t("wardrobe.uploadTitle")}
							</div>
							<p className="mt-1 text-sm text-muted-foreground">
								{t("wardrobe.uploadDescription")}
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
							<NativeSelectField
								label={t("profiles.textureType")}
								value={textureType}
								onChange={(next) =>
									dispatch({
										type: "textureType",
										value: next as MinecraftTextureType,
									})
								}
								options={[
									{ label: t("home.textureTypeSkin"), value: "skin" },
									{ label: t("home.textureTypeCape"), value: "cape" },
								]}
							/>
							<NativeSelectField
								label={t("profiles.model")}
								value={model}
								onChange={(next) =>
									dispatch({
										type: "model",
										value: next as MinecraftTextureModel,
									})
								}
								className={textureType === "skin" ? "" : "opacity-60"}
								options={[
									{ label: t("profiles.defaultModel"), value: "default" },
									{ label: t("profiles.slimModel"), value: "slim" },
								]}
							/>
						</div>
						<Field label={t("profiles.file")} htmlFor="wardrobe-texture-file">
							<Input
								id="wardrobe-texture-file"
								type="file"
								accept="image/png"
								onChange={(event) =>
									dispatch({
										type: "file",
										value: event.currentTarget.files?.[0] ?? null,
									})
								}
							/>
						</Field>
						<Button type="submit" disabled={!file || submitting}>
							<Icon
								name={submitting ? "Spinner" : "Upload"}
								className="size-4"
							/>
							{t("common.upload")}
						</Button>
					</form>

					<div className="grid min-w-0 content-start gap-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<div className="flex items-center gap-2 text-sm font-semibold">
									<Icon name="FileImage" className="size-4" />
									{t("wardrobe.libraryTitle")}
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									{t("wardrobe.libraryDescription")}
								</p>
							</div>
							<div className="relative sm:w-72">
								<Icon
									name="MagnifyingGlass"
									className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									value={query}
									placeholder={t("wardrobe.searchPlaceholder")}
									className="pl-8"
									onChange={(event) =>
										dispatch({
											type: "query",
											value: event.currentTarget.value,
										})
									}
								/>
							</div>
						</div>

						{loading ? (
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{Array.from({ length: 6 }, (_, index) => index + 1).map(
									(item) => (
										<Skeleton
											key={`wardrobe-skeleton-${item}`}
											className="h-64 rounded-lg"
										/>
									),
								)}
							</div>
						) : filteredTextures.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
								<div className="font-medium">{t("wardrobe.emptyTitle")}</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{textures.length === 0
										? t("wardrobe.emptyDescription")
										: t("wardrobe.noSearchResults")}
								</p>
							</div>
						) : (
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{filteredTextures.map((texture) => (
									<TextureCard
										key={texture.id}
										texture={texture}
										date={formatter.format(new Date(texture.created_at))}
										onBind={() => openBindDialog(texture)}
										onDelete={() => openDeleteDialog(texture)}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</section>

			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => dispatch({ type: "dialogOpen", value: open })}
			>
				<DialogContent keepMounted>
					<DialogHeader>
						<DialogTitle>{t("wardrobe.bindDialogTitle")}</DialogTitle>
						<DialogDescription>
							{activeTexture
								? t("wardrobe.bindDialogDescription", {
										type: t(`wardrobe.type.${activeTexture.texture_type}`),
									})
								: t("wardrobe.bindDialogFallback")}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3">
						<div className="relative">
							<Icon
								name="MagnifyingGlass"
								className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								value={profileQuery}
								placeholder={t("wardrobe.profileSearchPlaceholder")}
								className="pl-8"
								onChange={(event) =>
									dispatch({
										type: "profileQuery",
										value: event.currentTarget.value,
									})
								}
							/>
						</div>

						<div className="max-h-72 overflow-y-auto rounded-lg border border-border/70">
							{filteredProfiles.length === 0 ? (
								<div className="px-4 py-8 text-center text-sm text-muted-foreground">
									{profiles.length === 0
										? t("wardrobe.noProfiles")
										: t("wardrobe.noProfileSearchResults")}
								</div>
							) : (
								<div className="divide-y divide-border/70">
									{filteredProfiles.map((profile) => (
										<button
											key={profile.id}
											type="button"
											className={cn(
												"grid w-full gap-1 px-3 py-3 text-left transition-colors hover:bg-accent/35",
												selectedProfileId === profile.id && "bg-accent/50",
											)}
											onClick={() =>
												dispatch({
													type: "selectedProfileId",
													value: profile.id,
												})
											}
										>
											<span className="flex min-w-0 items-center gap-2">
												<span className="truncate font-medium">
													{profile.name}
												</span>
												{selectedProfileId === profile.id ? (
													<Badge variant="outline" className="rounded-md">
														{t("profiles.selected")}
													</Badge>
												) : null}
											</span>
											<span className="truncate font-mono text-xs text-muted-foreground">
												{profile.id}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<DialogClose
							render={
								<Button type="button" variant="outline" disabled={submitting} />
							}
						>
							{t("common.cancel")}
						</DialogClose>
						<Button
							type="button"
							disabled={!activeTexture || !selectedProfileId || submitting}
							onClick={() => void bindTexture()}
						>
							<Icon
								name={submitting ? "Spinner" : "LinkSimple"}
								className="size-4"
							/>
							{t("wardrobe.bindAction")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteDialogOpen}
				onOpenChange={(open) =>
					dispatch({ type: "deleteDialogOpen", value: open })
				}
			>
				<DialogContent keepMounted>
					<DialogHeader>
						<DialogTitle>{t("wardrobe.deleteDialogTitle")}</DialogTitle>
						<DialogDescription>
							{deleteTexture
								? t("wardrobe.deleteDialogDescription", {
										type: t(`wardrobe.type.${deleteTexture.texture_type}`),
									})
								: t("wardrobe.deleteDialogFallback")}
						</DialogDescription>
					</DialogHeader>

					{deleteTexture ? (
						<div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="rounded-md">
									{t(`wardrobe.type.${deleteTexture.texture_type}`)}
								</Badge>
								<Badge variant="outline" className="rounded-md">
									{deleteTexture.width}x{deleteTexture.height}
								</Badge>
							</div>
							<div className="truncate font-mono text-xs text-muted-foreground">
								{deleteTexture.hash}
							</div>
						</div>
					) : null}

					<DialogFooter>
						<DialogClose
							render={
								<Button type="button" variant="outline" disabled={submitting} />
							}
						>
							{t("common.cancel")}
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={!deleteTexture || submitting}
							onClick={() => void deleteWardrobeTexture()}
						>
							<Icon
								name={submitting ? "Spinner" : "Trash"}
								className="size-4"
							/>
							{t("wardrobe.deleteAction")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function TextureCard({
	texture,
	date,
	onBind,
	onDelete,
}: {
	texture: MinecraftWardrobeTextureMetadata;
	date: string;
	onBind: () => void;
	onDelete: () => void;
}) {
	const { t } = useTranslation();

	return (
		<article className="grid overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs">
			{texture.texture_type === "skin" ? (
				<StaticSkinPreview
					skinUrl={texture.url}
					model={texture.texture_model}
					alt={t("wardrobe.texturePreviewAlt", {
						type: t(`wardrobe.type.${texture.texture_type}`),
					})}
				/>
			) : (
				<div className="grid aspect-[5/4] place-items-center border-b border-border/70 bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--muted))_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--muted))_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0] p-4">
					<img
						src={texture.url}
						alt={t("wardrobe.texturePreviewAlt", {
							type: t(`wardrobe.type.${texture.texture_type}`),
						})}
						className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
					/>
				</div>
			)}
			<div className="grid gap-3 p-3">
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" className="rounded-md">
								{t(`wardrobe.type.${texture.texture_type}`)}
							</Badge>
							{texture.texture_type === "skin" ? (
								<Badge variant="outline" className="rounded-md">
									{texture.texture_model}
								</Badge>
							) : null}
						</div>
						<div className="mt-2 truncate font-mono text-xs text-muted-foreground">
							{texture.hash}
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Button
							type="button"
							size="icon-sm"
							variant="outline"
							onClick={onBind}
						>
							<Icon name="LinkSimple" className="size-4" />
							<span className="sr-only">{t("wardrobe.bindAction")}</span>
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant="destructive"
							onClick={onDelete}
						>
							<Icon name="Trash" className="size-4" />
							<span className="sr-only">{t("wardrobe.deleteAction")}</span>
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-3 gap-2 text-xs">
					<TextureFact
						label={t("wardrobe.dimensions")}
						value={`${texture.width}x${texture.height}`}
					/>
					<TextureFact
						label={t("wardrobe.size")}
						value={formatBytes(texture.file_size)}
					/>
					<TextureFact label={t("wardrobe.created")} value={date} />
				</div>
				<Button type="button" size="sm" onClick={onBind}>
					<Icon name="LinkSimple" className="size-4" />
					{t("wardrobe.bindToProfile")}
				</Button>
			</div>
		</article>
	);
}

function TextureFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 rounded-md bg-muted/35 px-2 py-1.5">
			<div className="truncate text-[11px] text-muted-foreground">{label}</div>
			<div className="mt-0.5 truncate font-medium">{value}</div>
		</div>
	);
}

function formatBytes(value: number) {
	if (value < 1024) return `${value} B`;
	const kib = value / 1024;
	if (kib < 1024) return `${kib.toFixed(1)} KiB`;
	return `${(kib / 1024).toFixed(1)} MiB`;
}

import {
	type FormEvent,
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useProfilesPageState } from "@/components/app/profiles-page/useProfilesPageState";
import { NativeSelectField, TextField } from "@/components/panel/FormControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LauncherSetupCard } from "@/components/yggdrasil/LauncherSetupCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { formatUnknownError } from "@/services/http";
import {
	YggdrasilProtocolError,
	yggdrasilService,
} from "@/services/yggdrasilService";
import type {
	MinecraftTextureMetadata,
	MinecraftTextureModel,
	MinecraftTextureType,
} from "@/types/api";

const MinecraftPreview = lazy(() =>
	import("@/components/yggdrasil/MinecraftPreview").then((module) => ({
		default: module.MinecraftPreview,
	})),
);

export default function ProfilesPage() {
	const { t } = useTranslation();
	const [state, dispatch] = useProfilesPageState();
	const {
		accessToken,
		file,
		loading,
		model,
		previewMotion,
		profileName,
		profiles,
		query,
		selectedUuid,
		textures,
		texturesLoading,
		textureType,
	} = state;

	usePageTitle(t("profiles.title"));

	const loadProfiles = useCallback(async () => {
		const next = await yggdrasilService.listProfiles();
		dispatch({ type: "profiles", value: next });
	}, [dispatch]);

	const loadTextures = useCallback(
		async (uuid: string) => {
			if (!uuid) {
				dispatch({ type: "textures", value: [] });
				return;
			}
			dispatch({ type: "texturesLoading", value: true });
			try {
				dispatch({
					type: "textures",
					value: await yggdrasilService.listProfileTextures(uuid),
				});
			} catch (nextError) {
				toast.error(formatUnknownError(nextError));
				dispatch({ type: "textures", value: [] });
			} finally {
				dispatch({ type: "texturesLoading", value: false });
			}
		},
		[dispatch],
	);

	useEffect(() => {
		void loadProfiles().catch((nextError) =>
			toast.error(formatUnknownError(nextError)),
		);
	}, [loadProfiles]);

	useEffect(() => {
		void loadTextures(selectedUuid);
	}, [selectedUuid, loadTextures]);

	const filteredProfiles = useMemo(() => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return profiles;
		return profiles.filter(
			(profile) =>
				profile.name.toLowerCase().includes(trimmed) ||
				profile.id.toLowerCase().includes(trimmed),
		);
	}, [profiles, query]);

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedUuid) ?? null,
		[profiles, selectedUuid],
	);
	const skinTexture =
		textures.find((texture) => texture.texture_type === "skin") ?? null;
	const capeTexture =
		textures.find((texture) => texture.texture_type === "cape") ?? null;

	async function createProfile(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		dispatch({ type: "loading", value: true });
		try {
			const created = await yggdrasilService.createProfile({
				name: profileName,
			});
			dispatch({ type: "profileName", value: "" });
			await loadProfiles();
			dispatch({ type: "selectedUuid", value: created.id });
		} catch (nextError) {
			toast.error(formatUnknownError(nextError));
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}

	async function uploadTexture(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!file || !selectedUuid) return;
		dispatch({ type: "loading", value: true });
		try {
			await yggdrasilService.uploadTexture({
				accessToken,
				uuid: selectedUuid,
				textureType,
				file,
				model,
			});
			dispatch({ type: "file", value: null });
			toast.success(t("profiles.uploadSuccess"));
			await loadTextures(selectedUuid);
		} catch (nextError) {
			toast.error(formatProfileError(nextError, t));
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}

	async function deleteTexture() {
		if (!selectedUuid) return;
		dispatch({ type: "loading", value: true });
		try {
			await yggdrasilService.deleteTexture({
				accessToken,
				uuid: selectedUuid,
				textureType,
			});
			toast.success(t("profiles.deleteSuccess"));
			await loadTextures(selectedUuid);
		} catch (nextError) {
			toast.error(formatProfileError(nextError, t));
		} finally {
			dispatch({ type: "loading", value: false });
		}
	}

	return (
		<div className="mx-auto grid w-full max-w-[92rem] gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(400px,0.94fr)] lg:px-7">
			<section className="grid min-w-0 content-start gap-4">
				<div className="rounded-lg border border-border/70 bg-card/90 shadow-xs">
					<div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline" className="rounded-md">
									{t("nav.profiles")}
								</Badge>
								<Badge variant="secondary" className="rounded-md">
									{t("profiles.totalProfiles", {
										count: profiles.length.toString(),
									})}
								</Badge>
							</div>
							<h1 className="mt-3 text-2xl font-semibold tracking-normal">
								{t("profiles.title")}
							</h1>
						</div>
						<form
							className="grid min-w-0 gap-2 sm:w-72"
							onSubmit={createProfile}
						>
							<Label htmlFor="profile-name">{t("profiles.profileName")}</Label>
							<div className="flex gap-2">
								<Input
									id="profile-name"
									value={profileName}
									placeholder={t("profiles.createPlaceholder")}
									required
									onChange={(event) =>
										dispatch({
											type: "profileName",
											value: event.currentTarget.value,
										})
									}
								/>
								<Button
									type="submit"
									size="icon"
									disabled={loading || !profileName.trim()}
									aria-label={t("common.create")}
								>
									<Icon
										name={loading ? "Spinner" : "Plus"}
										className="size-4"
									/>
								</Button>
							</div>
						</form>
					</div>

					<div className="grid gap-3 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<div className="flex items-center gap-2 text-sm font-semibold">
									<Icon name="User" className="size-4" />
									{t("profiles.listTitle")}
								</div>
							</div>
							<div className="relative sm:w-72">
								<Icon
									name="MagnifyingGlass"
									className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									value={query}
									placeholder={t("profiles.searchPlaceholder")}
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

						{profiles.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
								<div className="font-medium">{t("profiles.noProfiles")}</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{t("profiles.noProfilesDescription")}
								</p>
							</div>
						) : filteredProfiles.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
								{t("profiles.noSearchResults")}
							</div>
						) : (
							<div className="overflow-hidden rounded-lg border border-border/70">
								<div className="grid grid-cols-[minmax(0,1fr)_132px_88px] border-b border-border/70 bg-muted/35 px-3 py-2 text-xs font-medium text-muted-foreground">
									<span>{t("profiles.profileName")}</span>
									<span>{t("profiles.textures")}</span>
									<span className="text-right">{t("profiles.properties")}</span>
								</div>
								<div className="divide-y divide-border/70">
									{filteredProfiles.map((profile) => (
										<button
											key={profile.id}
											type="button"
											onClick={() =>
												dispatch({ type: "selectedUuid", value: profile.id })
											}
											className={cn(
												"grid w-full grid-cols-[minmax(0,1fr)_132px_88px] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/35",
												profile.id === selectedUuid && "bg-accent/45",
											)}
										>
											<div className="min-w-0">
												<div className="flex min-w-0 items-center gap-2">
													<span className="truncate font-medium">
														{profile.name}
													</span>
													{profile.id === selectedUuid ? (
														<Badge variant="outline" className="rounded-md">
															{t("profiles.selected")}
														</Badge>
													) : null}
												</div>
												<div className="mt-1 truncate font-mono text-xs text-muted-foreground">
													{profile.id}
												</div>
											</div>
											<TextureSummary
												active={profile.id === selectedUuid}
												textures={profile.id === selectedUuid ? textures : []}
												loading={profile.id === selectedUuid && texturesLoading}
											/>
											<div className="text-right">
												<Badge variant="secondary" className="rounded-md">
													{profile.properties?.length ?? 0}
												</Badge>
											</div>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="rounded-lg border border-border/70 bg-card/90 shadow-xs">
					<div className="border-b border-border/70 p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-sm font-semibold">
								<Icon name="Upload" className="size-4" />
								{t("profiles.textureTitle")}
							</div>
							<span className="text-xs text-muted-foreground">
								{t("profiles.textureDescription")}
							</span>
						</div>
					</div>
					<div className="p-4">
						<form
							className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-end"
							onSubmit={uploadTexture}
						>
							<TextField
								label={t("profiles.launcherAccessToken")}
								value={accessToken}
								onChange={(value) => dispatch({ type: "accessToken", value })}
								required
								className="md:col-span-3"
							/>
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
							<div className="grid gap-1.5">
								<Label htmlFor="texture-file">{t("profiles.file")}</Label>
								<Input
									id="texture-file"
									type="file"
									accept="image/png"
									onChange={(event) =>
										dispatch({
											type: "file",
											value: event.currentTarget.files?.[0] ?? null,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-2 sm:flex-row md:col-span-3">
								<Button
									type="submit"
									disabled={loading || !selectedUuid || !accessToken || !file}
									className="sm:min-w-36"
								>
									<Icon
										name={loading ? "Spinner" : "Upload"}
										className="size-4"
									/>
									{t("common.upload")}
								</Button>
								<Button
									type="button"
									variant="destructive"
									disabled={loading || !selectedUuid || !accessToken}
									onClick={() => void deleteTexture()}
									className="sm:min-w-36"
								>
									<Icon name="Trash" className="size-4" />
									{t("common.delete")}
								</Button>
								<div className="min-w-0 flex-1 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
									{selectedProfile
										? t("profiles.uploadTarget", { name: selectedProfile.name })
										: t("profiles.stepChoose")}
									{file ? (
										<span className="ml-2 font-medium text-foreground">
											{file.name}
										</span>
									) : null}
								</div>
							</div>
						</form>
					</div>
				</div>
			</section>

			<aside className="grid min-w-0 content-start gap-4">
				<Suspense fallback={<PreviewSkeleton />}>
					<MinecraftPreview
						label={selectedProfile?.name || t("profiles.uuid")}
						skinUrl={skinTexture?.url ?? null}
						capeUrl={capeTexture?.url ?? null}
						model={skinTexture?.texture_model ?? model}
						motion={previewMotion}
						className="lg:sticky lg:top-20"
						emptyTitle={t("profiles.previewEmptyTitle")}
						emptyDescription={t("profiles.previewEmptyDescription")}
						failedTitle={t("profiles.previewFailedTitle")}
						failedDescription={t("profiles.previewFailedDescription")}
						noSkinLabel={t("profiles.noSkinTexture")}
					/>
				</Suspense>
				<LauncherSetupCard profileName={selectedProfile?.name ?? null} />
				<div className="rounded-lg border border-border/70 bg-card/90 p-4 shadow-xs">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div className="text-sm font-semibold">
								{t("profiles.previewControls")}
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								{selectedProfile?.id ?? t("profiles.stepChoose")}
							</p>
						</div>
						<div className="flex rounded-lg border border-border/70 bg-muted/30 p-1">
							<Button
								type="button"
								size="sm"
								variant={previewMotion === "idle" ? "default" : "ghost"}
								onClick={() =>
									dispatch({ type: "previewMotion", value: "idle" })
								}
							>
								<Icon name="Pause" className="size-4" />
								{t("profiles.motionIdle")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant={previewMotion === "walk" ? "default" : "ghost"}
								onClick={() =>
									dispatch({ type: "previewMotion", value: "walk" })
								}
							>
								<Icon name="Play" className="size-4" />
								{t("profiles.motionWalk")}
							</Button>
						</div>
					</div>
					<div className="mt-4 grid gap-2">
						<TextureDetail
							title={t("home.textureTypeSkin")}
							texture={skinTexture}
							loading={texturesLoading}
							loadingLabel={t("profiles.textureMetadataLoading")}
							emptyLabel={t("profiles.noTextureUploaded")}
						/>
						<TextureDetail
							title={t("home.textureTypeCape")}
							texture={capeTexture}
							loading={texturesLoading}
							loadingLabel={t("profiles.textureMetadataLoading")}
							emptyLabel={t("profiles.noTextureUploaded")}
						/>
					</div>
				</div>
			</aside>
		</div>
	);
}

function PreviewSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs lg:sticky lg:top-20">
			<div className="flex min-h-12 items-center justify-between border-b border-border/70 px-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
				<Skeleton className="size-7 rounded-md" />
			</div>
			<Skeleton className="h-[26rem] rounded-none" />
		</div>
	);
}

function TextureSummary({
	active,
	loading,
	textures,
}: {
	active: boolean;
	loading: boolean;
	textures: MinecraftTextureMetadata[];
}) {
	if (!active) {
		return <span className="text-xs text-muted-foreground">-</span>;
	}
	if (loading) {
		return <Icon name="Spinner" className="size-4 text-muted-foreground" />;
	}
	const hasSkin = textures.some((texture) => texture.texture_type === "skin");
	const hasCape = textures.some((texture) => texture.texture_type === "cape");
	return (
		<div className="flex flex-wrap gap-1">
			<Badge variant={hasSkin ? "default" : "outline"} className="rounded-md">
				Skin
			</Badge>
			<Badge variant={hasCape ? "default" : "outline"} className="rounded-md">
				Cape
			</Badge>
		</div>
	);
}

function TextureDetail({
	emptyLabel,
	loading,
	loadingLabel,
	texture,
	title,
}: {
	emptyLabel: string;
	loading: boolean;
	loadingLabel: string;
	texture: MinecraftTextureMetadata | null;
	title: string;
}) {
	if (loading) {
		return (
			<div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
				<Icon name="Spinner" className="mr-2 inline size-4" />
				{loadingLabel}
			</div>
		);
	}
	return (
		<div className="rounded-lg border border-border/70 bg-muted/20 p-3">
			<div className="flex items-center justify-between gap-3">
				<div className="text-sm font-medium">{title}</div>
				<Badge variant={texture ? "default" : "outline"} className="rounded-md">
					{texture ? texture.texture_model : "empty"}
				</Badge>
			</div>
			{texture ? (
				<div className="mt-2 grid gap-1 text-xs text-muted-foreground">
					<div>
						{texture.width} x {texture.height}px ·{" "}
						{formatFileSize(texture.file_size)}
					</div>
					<div className="truncate font-mono">{texture.hash}</div>
				</div>
			) : (
				<div className="mt-2 text-xs text-muted-foreground">{emptyLabel}</div>
			)}
		</div>
	);
}

function formatFileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatProfileError(
	error: unknown,
	t: (key: string, values?: Record<string, string>) => string,
) {
	if (error instanceof YggdrasilProtocolError) {
		return t("profiles.protocolError", {
			error: error.error,
			message: error.message,
		});
	}
	return formatUnknownError(error);
}

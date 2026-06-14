import { useState } from "react";
import { config } from "@/config/app";
import { cn } from "@/lib/utils";
import type { AvatarInfo } from "@/types/api";

type UserAvatarImageProps = {
	name: string;
	alt?: string;
	avatar?: AvatarInfo | null;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASS_MAP = {
	sm: "size-8 text-xs",
	md: "size-10 text-sm",
	lg: "size-16 text-xl",
	xl: "size-24 text-3xl",
} as const;

function getInitials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function resolveAvatarUrl(avatar?: AvatarInfo | null) {
	const url = avatar?.url_512 ?? avatar?.url_1024;
	if (!url) return null;
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith("/")) return `${config.apiBaseUrl}${url}`;
	return url;
}

export function UserAvatarImage({
	alt,
	avatar,
	name,
	className,
	size = "md",
}: UserAvatarImageProps) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const avatarUrl = resolveAvatarUrl(avatar);
	const showAvatar = Boolean(avatarUrl && avatarUrl !== failedUrl);

	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/70 font-semibold text-muted-foreground ring-1 ring-border/60",
				SIZE_CLASS_MAP[size],
				className,
			)}
		>
			{showAvatar ? (
				<img
					src={avatarUrl ?? undefined}
					alt={alt ?? name}
					className="h-full w-full object-cover"
					onError={() => setFailedUrl(avatarUrl)}
				/>
			) : (
				<span aria-hidden>{getInitials(name)}</span>
			)}
		</div>
	);
}

import type { AppliedBranding } from "@/lib/branding";

type BrandMarkProps = {
	branding: AppliedBranding;
	className?: string;
	wordmarkClassName?: string;
};

export function BrandMark({
	branding,
	className,
	wordmarkClassName,
}: BrandMarkProps) {
	if (branding.wordmarkDarkUrl) {
		return (
			<img
				src={branding.wordmarkDarkUrl}
				alt={branding.title}
				className={wordmarkClassName ?? "h-9 max-w-44 object-contain"}
			/>
		);
	}

	return (
		<img
			src="/favicon.svg"
			alt={branding.title}
			className={className ?? "size-10 shrink-0 object-contain"}
		/>
	);
}

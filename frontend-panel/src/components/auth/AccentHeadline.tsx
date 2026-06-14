export function AccentHeadline({ text }: { text: string }) {
	const [before, after] = text.split("Aster");
	if (after === undefined) return text;
	return (
		<>
			{before}
			<span className="text-emerald-700 drop-shadow-[0_0_24px_rgba(52,211,153,0.28)] dark:text-emerald-300">
				Aster
			</span>
			{after}
		</>
	);
}

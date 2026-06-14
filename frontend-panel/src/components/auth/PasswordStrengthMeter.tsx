import { cn } from "@/lib/utils";

export function PasswordStrengthMeter({
	label,
	value,
	score,
}: {
	label: string;
	value: string;
	score: number;
}) {
	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-white/72">
				<span>{label}</span>
				<span
					className={cn(
						score >= 4
							? "text-emerald-700 dark:text-emerald-300"
							: score >= 2
								? "text-lime-700 dark:text-lime-300"
								: "text-slate-400 dark:text-white/50",
					)}
				>
					{value}
				</span>
			</div>
			<div className="grid h-2 grid-cols-4 gap-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/8">
				{[1, 2, 3, 4].map((segment) => (
					<span
						key={segment}
						className={cn(
							"rounded-full transition-colors duration-200",
							segment <= score
								? "bg-emerald-400"
								: "bg-black/10 dark:bg-white/8",
						)}
					/>
				))}
			</div>
		</div>
	);
}

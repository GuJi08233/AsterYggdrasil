import { Icon, type IconName } from "@/components/ui/icon";

export type AuthFeature = {
	icon: IconName;
	title: string;
	description: string;
};

export function AuthFeatureList({ features }: { features: AuthFeature[] }) {
	return (
		<div className="mt-9 grid max-w-xl gap-2.5">
			{features.map((feature) => (
				<div
					key={feature.title}
					className="flex max-w-xl gap-4 rounded-xl border border-black/10 bg-white/50 p-3 shadow-lg shadow-black/10 backdrop-blur-md dark:border-white/7 dark:bg-black/20"
				>
					<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-emerald-700/14 bg-emerald-600/10 text-emerald-700 shadow-lg shadow-black/15 dark:border-emerald-300/12 dark:bg-emerald-400/13 dark:text-emerald-300">
						<Icon name={feature.icon} className="size-6" />
					</div>
					<div className="min-w-0 pt-0.5">
						<div className="font-semibold text-[#102118] dark:text-white">
							{feature.title}
						</div>
						<p className="mt-1 text-sm leading-5 text-slate-600 dark:text-white/66">
							{feature.description}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}

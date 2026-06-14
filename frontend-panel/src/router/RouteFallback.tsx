import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/router/Loading";

export function AppRouteFallback() {
	return (
		<section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div className="space-y-5" aria-hidden="true">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-[min(34rem,78vw)]" />
					</div>
					<Skeleton className="h-9 w-32 rounded-md" />
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-28 rounded-lg" />
					<Skeleton className="h-28 rounded-lg" />
					<Skeleton className="h-28 rounded-lg" />
				</div>
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<Skeleton className="h-80 rounded-lg" />
					<div className="space-y-4">
						<Skeleton className="h-36 rounded-lg" />
						<Skeleton className="h-36 rounded-lg" />
					</div>
				</div>
			</div>
			<span className="sr-only">Loading route</span>
		</section>
	);
}

export function AdminRouteFallback() {
	return (
		<section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div className="space-y-4" aria-hidden="true">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-6 w-44" />
						<Skeleton className="h-4 w-[min(30rem,74vw)]" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-9 w-24 rounded-md" />
						<Skeleton className="h-9 w-28 rounded-md" />
					</div>
				</div>
				<div className="rounded-lg border border-border/65 bg-card/55 p-4 shadow-xs">
					<div className="mb-4 grid gap-3 md:grid-cols-4">
						<Skeleton className="h-10 rounded-md" />
						<Skeleton className="h-10 rounded-md" />
						<Skeleton className="h-10 rounded-md" />
						<Skeleton className="h-10 rounded-md" />
					</div>
					<div className="space-y-3">
						<Skeleton className="h-12 rounded-md" />
						<Skeleton className="h-12 rounded-md" />
						<Skeleton className="h-12 rounded-md" />
						<Skeleton className="h-12 rounded-md" />
						<Skeleton className="h-12 rounded-md" />
					</div>
				</div>
			</div>
			<span className="sr-only">Loading admin route</span>
		</section>
	);
}

export function PublicRouteFallback() {
	return <Loading surface="public" />;
}

export function AuthRouteFallback() {
	return <Loading surface="public" />;
}

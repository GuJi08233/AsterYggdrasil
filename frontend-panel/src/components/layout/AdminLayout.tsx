import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AdminRouteFallback } from "@/router/RouteFallback";

export function AdminLayout() {
	return (
		<div className="min-h-[calc(100dvh-4rem)] bg-muted/20 dark:bg-background">
			<div>
				<Suspense fallback={<AdminRouteFallback />}>
					<Outlet />
				</Suspense>
			</div>
		</div>
	);
}

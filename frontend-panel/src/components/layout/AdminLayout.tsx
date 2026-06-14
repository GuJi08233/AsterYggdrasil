import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminRouteFallback } from "@/router/RouteFallback";

export function AdminLayout() {
	const location = useLocation();

	return (
		<div className="min-h-[calc(100dvh-4rem)] bg-muted/20 dark:bg-background">
			<div key={location.pathname} className="app-route-transition">
				<Suspense fallback={<AdminRouteFallback />}>
					<Outlet />
				</Suspense>
			</div>
		</div>
	);
}

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ShellSidebar } from "@/components/shell/ShellSidebar";
import { ShellTopbar } from "@/components/shell/ShellTopbar";
import type { ShellScope } from "@/components/shell/shellNavigation";
import { cn } from "@/lib/utils";
import { AdminRouteFallback, AppRouteFallback } from "@/router/RouteFallback";
import { adminPaths } from "@/routes/routePaths";
import { useAuthStore } from "@/stores/authStore";
import { useFrontendConfigStore } from "@/stores/frontendConfigStore";

export function AppLayout({ scope }: { scope?: ShellScope }) {
	const location = useLocation();
	const user = useAuthStore((state) => state.user);
	const isAdmin = useAuthStore((state) => state.isAdmin);
	const logout = useAuthStore((state) => state.logout);
	const branding = useFrontendConfigStore((state) => state.branding);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
	const previousPathnameRef = useRef(location.pathname);
	const resolvedScope = scope
		? scope
		: location.pathname.startsWith(adminPaths.home)
			? "admin"
			: "account";
	const isAdminScope = resolvedScope === "admin";

	const handleMobileSidebarToggle = useCallback(() => {
		setMobileSidebarOpen((current) => !current);
	}, []);

	const handleMobileSidebarClose = useCallback(() => {
		setMobileSidebarOpen(false);
	}, []);

	useEffect(() => {
		if (previousPathnameRef.current === location.pathname) {
			return;
		}

		previousPathnameRef.current = location.pathname;
		setMobileSidebarOpen(false);
	});

	useEffect(() => {
		if (!mobileSidebarOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMobileSidebarOpen(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [mobileSidebarOpen]);

	return (
		<div
			className={cn(
				"app-shell min-h-dvh text-foreground",
				isAdminScope ? "admin-shell" : "bg-background",
			)}
		>
			<div className="grid min-h-dvh lg:grid-cols-[17rem_minmax(0,1fr)]">
				<ShellSidebar
					branding={branding}
					isAdmin={isAdmin}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={handleMobileSidebarClose}
				/>
				<div className="min-w-0">
					<ShellTopbar
						branding={branding}
						isAdminScope={isAdminScope}
						mobileSidebarOpen={mobileSidebarOpen}
						onMobileSidebarToggle={handleMobileSidebarToggle}
						onLogout={() => void logout()}
						user={user}
					/>
					<main>
						<div>
							<Suspense
								fallback={
									isAdminScope ? <AdminRouteFallback /> : <AppRouteFallback />
								}
							>
								<Outlet />
							</Suspense>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

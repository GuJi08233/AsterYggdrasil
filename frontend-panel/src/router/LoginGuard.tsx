import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthRouteFallback } from "@/router/RouteFallback";
import { useAuthStore } from "@/stores/authStore";

export function LoginGuard() {
	const hydrate = useAuthStore((state) => state.hydrate);
	const checking = useAuthStore((state) => state.checking);
	const isAuthStale = useAuthStore((state) => state.isAuthStale);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	useEffect(() => {
		if (!isAuthenticated && !isAuthStale) return;
		void hydrate();
	}, [hydrate, isAuthenticated, isAuthStale]);

	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}
	if (checking && isAuthStale) {
		return <AuthRouteFallback />;
	}
	return <Outlet />;
}

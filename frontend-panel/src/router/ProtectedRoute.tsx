import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "@/router/Loading";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute() {
	const hydrate = useAuthStore((state) => state.hydrate);
	const checking = useAuthStore((state) => state.checking);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	if (checking) {
		return <Loading />;
	}
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}
	return <Outlet />;
}

import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function AdminRoute() {
	const isAdmin = useAuthStore((state) => state.isAdmin);
	if (!isAdmin) {
		return <Navigate to="/dashboard" replace />;
	}
	return <Outlet />;
}

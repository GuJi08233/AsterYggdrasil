import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function usePublicSession() {
	const checkPublicSession = useAuthStore((state) => state.checkPublicSession);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const logout = useAuthStore((state) => state.logout);
	const user = useAuthStore((state) => state.user);

	useEffect(() => {
		void checkPublicSession();
	}, [checkPublicSession]);

	return {
		isAuthenticated: isAuthenticated && user !== null,
		logout,
		user,
	};
}

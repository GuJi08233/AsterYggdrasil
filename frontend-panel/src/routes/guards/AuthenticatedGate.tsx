import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Loading } from "@/router/Loading";
import { RouteAccessState } from "@/routes/guards/RouteAccessState";
import { accountPaths, publicPaths } from "@/routes/routePaths";
import { useAuthStore } from "@/stores/authStore";

export function AuthenticatedGate() {
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
		return (
			<RouteAccessState
				actionHref={publicPaths.login}
				actionLabelKey="shell.routeState.loginRequiredAction"
				descriptionKey="shell.routeState.loginRequiredDescription"
				icon="Lock"
				titleKey="shell.routeState.loginRequiredTitle"
			/>
		);
	}
	return <Outlet />;
}

export function authenticatedFallbackPath() {
	return accountPaths.home;
}

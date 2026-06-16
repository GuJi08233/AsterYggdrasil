import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { PublicRouteFallback } from "@/router/RouteFallback";
import { RouteAccessState } from "@/routes/guards/RouteAccessState";
import { publicPaths } from "@/routes/routePaths";
import { useInitStatusStore } from "@/stores/initStatusStore";

export function InitializedGate() {
	const check = useInitStatusStore((state) => state.check);
	const checking = useInitStatusStore((state) => state.checking);
	const initialized = useInitStatusStore((state) => state.initialized);

	useEffect(() => {
		void check();
	}, [check]);

	if (checking && initialized === null) {
		return <PublicRouteFallback />;
	}
	if (initialized === false) {
		return (
			<RouteAccessState
				actionHref={publicPaths.init}
				actionLabelKey="shell.routeState.setupRequiredAction"
				descriptionKey="shell.routeState.setupRequiredDescription"
				icon="Wrench"
				titleKey="shell.routeState.setupRequiredTitle"
			/>
		);
	}
	return <Outlet />;
}

export function UninitializedGate() {
	const check = useInitStatusStore((state) => state.check);
	const checking = useInitStatusStore((state) => state.checking);
	const initialized = useInitStatusStore((state) => state.initialized);

	useEffect(() => {
		void check({ force: true });
	}, [check]);

	if (checking && initialized === null) {
		return <PublicRouteFallback />;
	}
	if (initialized === true) {
		return (
			<RouteAccessState
				actionHref={publicPaths.login}
				actionLabelKey="shell.routeState.setupCompleteAction"
				descriptionKey="shell.routeState.setupCompleteDescription"
				icon="Lock"
				titleKey="shell.routeState.setupCompleteTitle"
			/>
		);
	}
	return <Outlet />;
}

import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PublicRouteFallback } from "@/router/RouteFallback";
import { useInitStatusStore } from "@/stores/initStatusStore";

export function RequireInitialized() {
	const location = useLocation();
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
			<Navigate
				to="/init"
				replace
				state={{ from: `${location.pathname}${location.search}` }}
			/>
		);
	}
	return <Outlet />;
}

export function RequireUninitialized() {
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
		return <Navigate to="/login" replace />;
	}
	return <Outlet />;
}

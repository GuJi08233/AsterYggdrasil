import type { RouteObject } from "react-router-dom";
import { lazyWithPreload } from "@/lib/lazyWithPreload";
import { publicPaths } from "@/routes/routePaths";
import { publicElement } from "@/routes/routeSuspense";

const PublicConnectPage = lazyWithPreload(
	() => import("@/pages/PublicConnectPage"),
);

export const publicRoutes = [
	{
		path: publicPaths.home,
		element: publicElement(<PublicConnectPage />),
	},
] satisfies RouteObject[];

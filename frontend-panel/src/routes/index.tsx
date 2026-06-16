import { createBrowserRouter } from "react-router-dom";
import { lazyWithPreload } from "@/lib/lazyWithPreload";
import ErrorPage from "@/pages/ErrorPage";
import { accountRoutes } from "@/routes/accountRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { authRoutes } from "@/routes/authRoutes";
import { AuthenticatedGate } from "@/routes/guards/AuthenticatedGate";
import { InitializedGate, UninitializedGate } from "@/routes/guards/InitGate";
import { publicRoutes } from "@/routes/publicRoutes";
import { publicPaths } from "@/routes/routePaths";
import { publicElement } from "@/routes/routeSuspense";

const InitPage = lazyWithPreload(() => import("@/pages/InitPage"));

export const router = createBrowserRouter([
	{
		path: publicPaths.init,
		element: <UninitializedGate />,
		errorElement: <ErrorPage />,
		children: [{ index: true, element: publicElement(<InitPage />) }],
	},
	{
		element: <InitializedGate />,
		errorElement: <ErrorPage />,
		children: [
			...publicRoutes,
			...authRoutes,
			{
				element: <AuthenticatedGate />,
				children: [...accountRoutes, ...adminRoutes],
			},
		],
	},
]);

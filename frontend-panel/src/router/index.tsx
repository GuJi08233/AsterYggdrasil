import { type ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazyWithPreload } from "@/lib/lazyWithPreload";
import ErrorPage from "@/pages/ErrorPage";
import { AdminRoute } from "@/router/AdminRoute";
import {
	RequireInitialized,
	RequireUninitialized,
} from "@/router/InitStatusGate";
import { LoginGuard } from "@/router/LoginGuard";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { AuthRouteFallback, PublicRouteFallback } from "@/router/RouteFallback";

const AdminSettingsPage = lazyWithPreload(
	() => import("@/pages/admin/AdminSettingsPage"),
);
const AdminAuditPage = lazyWithPreload(
	() => import("@/pages/admin/AdminAuditPage"),
);
const AdminTasksPage = lazyWithPreload(
	() => import("@/pages/admin/AdminTasksPage"),
);
const AdminAboutPage = lazyWithPreload(
	() => import("@/pages/admin/AdminAboutPage"),
);
const AdminExternalAuthPage = lazyWithPreload(
	() => import("@/pages/admin/AdminExternalAuthPage"),
);
const AdminUsersPage = lazyWithPreload(
	() => import("@/pages/admin/AdminUsersPage"),
);
const AdminMinecraftProfilePage = lazyWithPreload(
	() => import("@/pages/admin/AdminMinecraftProfilePage"),
);
const AdminUserDetailPage = lazyWithPreload(
	() => import("@/pages/admin/AdminUserDetailPage"),
);
const ProfilesPage = lazyWithPreload(() => import("@/pages/app/ProfilesPage"));
const PersonalSettingsPage = lazyWithPreload(
	() => import("@/pages/app/PersonalSettingsPage"),
);
const WardrobePage = lazyWithPreload(() => import("@/pages/app/WardrobePage"));
const WorkbenchPage = lazyWithPreload(
	() => import("@/pages/app/WorkbenchPage"),
);
const ExternalAuthPage = lazyWithPreload(
	() => import("@/pages/ExternalAuthPage"),
);
const InitPage = lazyWithPreload(() => import("@/pages/InitPage"));
const LoginPage = lazyWithPreload(() => import("@/pages/LoginPage"));
const PublicConnectPage = lazyWithPreload(
	() => import("@/pages/PublicConnectPage"),
);

function publicElement(element: ReactNode) {
	return <Suspense fallback={<PublicRouteFallback />}>{element}</Suspense>;
}

function authElement(element: ReactNode) {
	return <Suspense fallback={<AuthRouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
	{
		path: "/init",
		element: <RequireUninitialized />,
		errorElement: <ErrorPage />,
		children: [{ index: true, element: publicElement(<InitPage />) }],
	},
	{
		element: <RequireInitialized />,
		errorElement: <ErrorPage />,
		children: [
			{
				path: "/",
				element: publicElement(<PublicConnectPage />),
			},
			{
				path: "/login",
				element: <LoginGuard />,
				children: [{ index: true, element: authElement(<LoginPage />) }],
			},
			{
				path: "/register",
				element: <LoginGuard />,
				children: [{ index: true, element: authElement(<LoginPage />) }],
			},
			{
				element: <ProtectedRoute />,
				children: [
					{
						element: <AppLayout />,
						children: [
							{ path: "/dashboard", element: <WorkbenchPage /> },
							{ path: "/dashboard/profiles", element: <ProfilesPage /> },
							{ path: "/dashboard/wardrobe", element: <WardrobePage /> },
							{
								path: "/dashboard/settings",
								element: <PersonalSettingsPage />,
							},
							{
								path: "/dashboard/launcher",
								element: <Navigate to="/dashboard/profiles" replace />,
							},
							{
								element: <AdminRoute />,
								children: [
									{
										element: <AdminLayout />,
										children: [
											{
												path: "/dashboard/admin",
												element: (
													<Navigate to="/dashboard/admin/settings" replace />
												),
											},
											{
												path: "/dashboard/admin/audit",
												element: <AdminAuditPage />,
											},
											{
												path: "/dashboard/admin/users",
												element: <AdminUsersPage />,
											},
											{
												path: "/dashboard/admin/minecraft-profiles/:uuid",
												element: <AdminMinecraftProfilePage />,
											},
											{
												path: "/dashboard/admin/users/:id",
												element: <AdminUserDetailPage />,
											},
											{
												path: "/dashboard/admin/external-auth",
												element: <AdminExternalAuthPage />,
											},
											{
												path: "/dashboard/admin/tasks",
												element: <AdminTasksPage />,
											},
											{
												path: "/dashboard/admin/settings",
												element: <AdminSettingsPage />,
											},
											{
												path: "/dashboard/admin/about",
												element: <AdminAboutPage />,
											},
										],
									},
								],
							},
						],
					},
				],
			},
			{ path: "/auth", element: <Navigate to="/login" replace /> },
			{ path: "/app", element: <Navigate to="/dashboard" replace /> },
			{
				path: "/app/profiles",
				element: <Navigate to="/dashboard/profiles" replace />,
			},
			{
				path: "/app/launcher",
				element: <Navigate to="/dashboard/profiles" replace />,
			},
			{ path: "/admin", element: <Navigate to="/dashboard/admin" replace /> },
			{
				path: "/external-auth",
				element: publicElement(<ExternalAuthPage />),
			},
			{ path: "*", element: <Navigate to="/" replace /> },
		],
	},
]);

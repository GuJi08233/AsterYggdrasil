import type { CSSProperties } from "react";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { i18next } from "@/i18n";
import { router } from "@/router";
import { useAuthStore } from "@/stores/authStore";
import {
	initFrontendConfigRuntime,
	useFrontendConfigStore,
} from "@/stores/frontendConfigStore";
import { initThemeRuntime } from "@/stores/themeStore";

initThemeRuntime();
initFrontendConfigRuntime();
void useFrontendConfigStore.getState().load();

const toasterStyle = {
	zIndex: "var(--z-toast)",
	"--normal-bg": "color-mix(in oklch, var(--card) 96%, var(--background))",
	"--normal-border":
		"color-mix(in oklch, var(--border) 86%, var(--foreground))",
	"--normal-text": "var(--foreground)",
	"--toast-success": "oklch(0.7 0.16 158)",
	"--toast-info": "var(--primary)",
	"--toast-warning": "var(--chart-3)",
	"--toast-error": "var(--destructive)",
} satisfies CSSProperties & Record<`--${string}`, string>;

function App() {
	usePwaUpdate();
	const checking = useAuthStore((state) => state.checking);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const role = useAuthStore((state) => state.user?.role);

	useEffect(() => {
		if (checking || !isAuthenticated) return;

		void import("@/lib/pwaWarmup").then(({ warmupRouteChunks }) => {
			warmupRouteChunks(role === "admin" ? "admin" : "user");
		});
	}, [checking, isAuthenticated, role]);

	return (
		<>
			<RouterProvider router={router} />
			<Toaster
				position="bottom-right"
				closeButton
				dir={i18next.dir()}
				offset={18}
				mobileOffset={12}
				swipeDirections={["right"]}
				style={toasterStyle}
				toastOptions={{
					duration: 4200,
				}}
			/>
		</>
	);
}

export default App;

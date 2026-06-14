import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function logPwaUpdate(message: string, extra?: unknown) {
	if (!import.meta.env.DEV) return;
	if (extra === undefined) {
		console.debug(`[pwa-update] ${message}`);
		return;
	}
	console.debug(`[pwa-update] ${message}`, extra);
}

export function usePwaUpdate() {
	const { t } = useTranslation();
	const {
		needRefresh: [needRefresh],
		offlineReady: [offlineReady],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(registration) {
			logPwaUpdate("registered", {
				active: registration?.active?.scriptURL,
				installing: registration?.installing?.scriptURL,
				scope: registration?.scope,
				waiting: registration?.waiting?.scriptURL,
			});

			if (!registration) return;
			window.setInterval(
				() => {
					logPwaUpdate("manual update check");
					void registration.update();
				},
				60 * 60 * 1000,
			);
		},
		onRegisterError(error) {
			logPwaUpdate("register error", error);
		},
	});

	useEffect(() => {
		logPwaUpdate("needRefresh changed", needRefresh);
	}, [needRefresh]);

	useEffect(() => {
		logPwaUpdate("offlineReady changed", offlineReady);
	}, [offlineReady]);

	useEffect(() => {
		if (!needRefresh) return;

		toast.info(t("pwa.updateAvailable"), {
			action: {
				label: t("pwa.refresh"),
				onClick: () => {
					logPwaUpdate("apply update clicked");
					void updateServiceWorker(true);
				},
			},
			duration: Number.POSITIVE_INFINITY,
		});
	}, [needRefresh, t, updateServiceWorker]);
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	AUTH_REDIRECT_PARAM,
	authRedirectToastKey,
	clearAuthRedirectStatus,
} from "@/lib/authRedirectToast";

export function useAuthRedirectToast() {
	const { t } = useTranslation();
	const location = useLocation();
	const navigate = useNavigate();
	const pathname = location.pathname;
	const search = location.search;
	const hash = location.hash;

	useEffect(() => {
		const params = new URLSearchParams(search);
		const messageKey = authRedirectToastKey(params.get(AUTH_REDIRECT_PARAM));
		if (!messageKey) return;

		toast.success(t(messageKey));
		navigate(
			{
				pathname,
				search: clearAuthRedirectStatus(search),
				hash,
			},
			{ replace: true },
		);
	}, [hash, navigate, pathname, search, t]);
}

export const AUTH_REDIRECT_PARAM = "auth_redirect";

export const AUTH_REDIRECT_STATUS = {
	externalAuthLinked: "external_auth_linked",
	loginSuccess: "login_success",
} as const;

export type AuthRedirectStatus =
	(typeof AUTH_REDIRECT_STATUS)[keyof typeof AUTH_REDIRECT_STATUS];

export function authRedirectToastKey(status: string | null | undefined) {
	switch (status) {
		case AUTH_REDIRECT_STATUS.externalAuthLinked:
			return "login.externalAuthPasswordLinked";
		case AUTH_REDIRECT_STATUS.loginSuccess:
			return "login.loginSuccess";
		default:
			return null;
	}
}

export function appendAuthRedirectStatus(
	path: string,
	status: AuthRedirectStatus,
) {
	const hashIndex = path.indexOf("#");
	const pathAndSearch = hashIndex === -1 ? path : path.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
	const searchIndex = pathAndSearch.indexOf("?");
	const pathname =
		searchIndex === -1 ? pathAndSearch : pathAndSearch.slice(0, searchIndex);
	const search = searchIndex === -1 ? "" : pathAndSearch.slice(searchIndex + 1);
	const params = new URLSearchParams(search);
	params.set(AUTH_REDIRECT_PARAM, status);
	const nextSearch = params.toString();
	return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`;
}

export function clearAuthRedirectStatus(search: string) {
	const params = new URLSearchParams(search);
	params.delete(AUTH_REDIRECT_PARAM);
	const nextSearch = params.toString();
	return nextSearch ? `?${nextSearch}` : "";
}

import { useReducer } from "react";
import { parsePageSizeSearchParam } from "@/lib/pagination";
import type {
	AdminUserInfo,
	DateTimeIdCursor,
	UserRole,
	UserStatus,
} from "@/types/api";

export const USER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_USER_PAGE_SIZE = 20 as const;

export type UserFilterValue<T extends string> = "__all__" | T;

export type AdminUsersPageState = {
	createDialogOpen: boolean;
	debouncedKeyword: string;
	deletingId: number | null;
	deletingUser: AdminUserInfo | null;
	items: AdminUserInfo[];
	keyword: string;
	loading: boolean;
	cursorStack: DateTimeIdCursor[];
	nextCursor: DateTimeIdCursor | null;
	pageSize: (typeof USER_PAGE_SIZE_OPTIONS)[number];
	revokingId: number | null;
	revokingUser: AdminUserInfo | null;
	role: UserFilterValue<UserRole>;
	status: UserFilterValue<UserStatus>;
	submitting: boolean;
	total: number;
};

export type AdminUsersPageAction =
	| { type: "createDialogOpen"; value: boolean }
	| { type: "debouncedKeyword"; value: string }
	| { type: "deletingId"; value: number | null }
	| { type: "deletingUser"; value: AdminUserInfo | null }
	| { type: "keyword"; value: string }
	| { type: "loadStart" }
	| {
			type: "loadSuccess";
			items: AdminUserInfo[];
			nextCursor: DateTimeIdCursor | null;
			total: number;
	  }
	| { type: "loading"; value: boolean }
	| { type: "nextPage" }
	| { type: "pageSize"; value: (typeof USER_PAGE_SIZE_OPTIONS)[number] }
	| { type: "previousPage" }
	| { type: "resetCursor" }
	| { type: "resetFilters" }
	| { type: "revokingId"; value: number | null }
	| { type: "revokingUser"; value: AdminUserInfo | null }
	| { type: "role"; value: UserFilterValue<UserRole> }
	| { type: "status"; value: UserFilterValue<UserStatus> }
	| { type: "submitting"; value: boolean };

function reducer(
	state: AdminUsersPageState,
	action: AdminUsersPageAction,
): AdminUsersPageState {
	switch (action.type) {
		case "createDialogOpen":
			return { ...state, createDialogOpen: action.value };
		case "debouncedKeyword":
			return { ...state, debouncedKeyword: action.value };
		case "deletingId":
			return { ...state, deletingId: action.value };
		case "deletingUser":
			return { ...state, deletingUser: action.value };
		case "keyword":
			return resetCursor({ ...state, keyword: action.value });
		case "loadStart":
			return { ...state, loading: true };
		case "loadSuccess":
			return {
				...state,
				items: action.items,
				loading: false,
				nextCursor: action.nextCursor,
				total: action.total,
			};
		case "loading":
			return { ...state, loading: action.value };
		case "nextPage":
			if (!state.nextCursor) return state;
			return {
				...state,
				cursorStack: [...state.cursorStack, state.nextCursor],
				nextCursor: null,
			};
		case "pageSize":
			return resetCursor({ ...state, pageSize: action.value });
		case "previousPage":
			return {
				...state,
				cursorStack: state.cursorStack.slice(0, -1),
				nextCursor: null,
			};
		case "resetCursor":
			return resetCursor(state);
		case "resetFilters":
			return {
				...state,
				debouncedKeyword: "",
				keyword: "",
				cursorStack: [],
				nextCursor: null,
				role: "__all__",
				status: "__all__",
			};
		case "revokingId":
			return { ...state, revokingId: action.value };
		case "revokingUser":
			return { ...state, revokingUser: action.value };
		case "role":
			return resetCursor({ ...state, role: action.value });
		case "status":
			return resetCursor({ ...state, status: action.value });
		case "submitting":
			return { ...state, submitting: action.value };
	}
}

function resetCursor(state: AdminUsersPageState): AdminUsersPageState {
	return { ...state, cursorStack: [], nextCursor: null };
}

export function useAdminUsersPageState(searchParams: URLSearchParams) {
	return useReducer(reducer, searchParams, (params): AdminUsersPageState => {
		const keyword = params.get("keyword") ?? "";
		return {
			createDialogOpen: false,
			debouncedKeyword: keyword,
			deletingId: null,
			deletingUser: null,
			items: [],
			keyword,
			loading: true,
			cursorStack: [],
			nextCursor: null,
			pageSize: parsePageSizeSearchParam(
				params.get("pageSize"),
				USER_PAGE_SIZE_OPTIONS,
				DEFAULT_USER_PAGE_SIZE,
			),
			revokingId: null,
			revokingUser: null,
			role: parseRole(params.get("role")),
			status: parseStatus(params.get("status")),
			submitting: false,
			total: 0,
		};
	});
}

function parseRole(value: string | null): UserFilterValue<UserRole> {
	return value === "admin" || value === "operator" || value === "user"
		? value
		: "__all__";
}

function parseStatus(value: string | null): UserFilterValue<UserStatus> {
	return value === "active" || value === "disabled" ? value : "__all__";
}

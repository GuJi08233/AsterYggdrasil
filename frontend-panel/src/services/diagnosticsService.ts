import type { IconName } from "@/components/ui/icon";
import type {
	AsterErrorCode,
	CheckResp,
	ExternalAuthPublicProvider,
	HealthResponse,
} from "@/types/api";
import { ApiError, api, formatUnknownError } from "./http";

export type ServiceDiagnosticStatus =
	| "idle"
	| "loading"
	| "ok"
	| "guarded"
	| "error";

export type ServiceDiagnosticResult = {
	id: string;
	group: string;
	label: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	icon: IconName;
	status: ServiceDiagnosticStatus;
	value: string;
	detail?: string;
	error?: string;
};

type ServiceDiagnosticDefinition = Omit<
	ServiceDiagnosticResult,
	"status" | "value" | "detail" | "error"
> & {
	load: (signal: AbortSignal) => Promise<unknown>;
	summarize: (data: unknown) => string;
	describe?: (data: unknown) => string | undefined;
	guardedErrorCodes?: AsterErrorCode[];
	guardedValue?: string;
};

function defineDiagnostic<T>(
	definition: Omit<
		ServiceDiagnosticResult,
		"status" | "value" | "detail" | "error"
	> & {
		load: (signal: AbortSignal) => Promise<T>;
		summarize: (data: T) => string;
		describe?: (data: T) => string | undefined;
		guardedErrorCodes?: AsterErrorCode[];
		guardedValue?: string;
	},
): ServiceDiagnosticDefinition {
	return definition as ServiceDiagnosticDefinition;
}

const definitions: ServiceDiagnosticDefinition[] = [
	defineDiagnostic<HealthResponse>({
		id: "health",
		group: "Runtime",
		label: "Process health",
		method: "GET",
		path: "/health",
		icon: "Gauge",
		load: async (signal) => {
			const response = await api.rootClient.get<HealthResponse>("/health", {
				signal,
			});
			return response.data;
		},
		summarize: (data) => data.status,
	}),
	defineDiagnostic<HealthResponse>({
		id: "ready",
		group: "Runtime",
		label: "Database readiness",
		method: "GET",
		path: "/health/ready",
		icon: "HardDrive",
		load: (signal) => api.root.get<HealthResponse>("/health/ready", { signal }),
		summarize: (data) => data.status,
	}),
	defineDiagnostic<CheckResp>({
		id: "auth-check",
		group: "Identity",
		label: "Auth bootstrap state",
		method: "GET",
		path: "/api/v1/auth/check",
		icon: "Key",
		load: (signal) => api.get<CheckResp>("/auth/check", { signal }),
		summarize: (data) => (data.initialized ? "initialized" : "setup required"),
		describe: () => "first-admin gate",
	}),
	defineDiagnostic<ExternalAuthPublicProvider[]>({
		id: "external-auth",
		group: "Identity",
		label: "External auth providers",
		method: "GET",
		path: "/api/v1/auth/external-auth/providers",
		icon: "Globe",
		load: (signal) =>
			api.get<ExternalAuthPublicProvider[]>("/auth/external-auth/providers", {
				signal,
			}),
		summarize: (data) => `${data.length}`,
		describe: (data) => {
			if (data.length === 0) return "no enabled providers";
			return data.map((provider) => provider.display_name).join(", ");
		},
	}),
];

export const DIAGNOSTIC_ENDPOINTS = definitions.map(
	({ load, summarize, describe, guardedErrorCodes, guardedValue, ...meta }) =>
		meta,
);

export function createIdleDiagnostics(
	status: Extract<ServiceDiagnosticStatus, "idle" | "loading"> = "idle",
): ServiceDiagnosticResult[] {
	return definitions.map(({ load, summarize, describe, ...definition }) => ({
		...definition,
		status,
		value: status === "loading" ? "checking" : "not checked",
	}));
}

async function runDiagnostic(
	definition: ServiceDiagnosticDefinition,
	signal: AbortSignal,
): Promise<ServiceDiagnosticResult> {
	const {
		load,
		summarize,
		describe,
		guardedErrorCodes,
		guardedValue,
		...meta
	} = definition;

	try {
		const data = await load(signal);
		return {
			...meta,
			status: "ok",
			value: summarize(data),
			detail: describe?.(data),
		};
	} catch (error) {
		if (error instanceof ApiError && guardedErrorCodes?.includes(error.code)) {
			return {
				...meta,
				status: "guarded",
				value: guardedValue ?? "access controlled",
				detail: error.message,
			};
		}

		return {
			...meta,
			status: "error",
			value: "request failed",
			error: formatUnknownError(error),
		};
	}
}

export async function loadServiceDiagnostics(
	signal: AbortSignal,
): Promise<ServiceDiagnosticResult[]> {
	return Promise.all(
		definitions.map((definition) => runDiagnostic(definition, signal)),
	);
}

import { withQuery } from "@/lib/query";
import type {
	CheckResp,
	ExternalAuthPublicProviderPage,
	HealthResponse,
} from "@/types/api";
import { api } from "./http";

async function getRootJson<T>(path: string, signal?: AbortSignal): Promise<T> {
	const response = await api.rootClient.get<T>(path, { signal });
	return response.data;
}

export const systemService = {
	health: (signal?: AbortSignal) =>
		getRootJson<HealthResponse>("/health", signal),
	ready: (signal?: AbortSignal) =>
		api.root.get<HealthResponse>("/health/ready", { signal }),
	checkAuth: (signal?: AbortSignal) =>
		api.get<CheckResp>("/auth/check", { signal }),
	publicExternalAuthProviders: (signal?: AbortSignal) =>
		api.get<ExternalAuthPublicProviderPage>(
			withQuery("/auth/external-auth/providers", { limit: 20, offset: 0 }),
			{ signal },
		),
	authExternalAuthProviders: (signal?: AbortSignal) =>
		api.get<ExternalAuthPublicProviderPage>(
			withQuery("/auth/external-auth/providers", { limit: 20, offset: 0 }),
			{ signal },
		),
};

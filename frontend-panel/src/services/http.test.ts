import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { AxiosHeaders } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import { api } from "./http";

const originalClientAdapter = api.client.defaults.adapter;
const originalRootClientAdapter = api.rootClient.defaults.adapter;

afterEach(() => {
	api.client.defaults.adapter = originalClientAdapter;
	api.rootClient.defaults.adapter = originalRootClientAdapter;
});

function captureRequestAdapter(
	capture: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter {
	return async (config) => {
		capture(config);
		return {
			config,
			data: { code: "success", msg: "", data: { ok: true } },
			headers: {},
			status: 200,
			statusText: "OK",
		};
	};
}

describe("shared http client", () => {
	it("keeps JSON content type for ordinary API request bodies", async () => {
		let request: InternalAxiosRequestConfig | null = null;
		api.client.defaults.adapter = captureRequestAdapter((config) => {
			request = config;
		});

		await api.post("/auth/login", {
			identifier: "steve",
			password: "secret",
		});

		const headers = AxiosHeaders.from(request?.headers);
		expect(headers.get("Content-Type")).toBe("application/json");
	});

	it("does not force JSON content type for versioned FormData uploads", async () => {
		let request: InternalAxiosRequestConfig | null = null;
		api.client.defaults.adapter = captureRequestAdapter((config) => {
			request = config;
		});
		const form = new FormData();
		form.append("file", new File(["png"], "skin.png", { type: "image/png" }));

		await api.post("/wardrobe/textures/skin", form);

		const headers = AxiosHeaders.from(request?.headers);
		expect(headers.get("Content-Type")).toBe(false);
		expect(headers.toJSON()).not.toHaveProperty("Content-Type");
	});

	it("does not force JSON content type for root FormData uploads", async () => {
		let request: InternalAxiosRequestConfig | null = null;
		api.rootClient.defaults.adapter = captureRequestAdapter((config) => {
			request = config;
		});
		const form = new FormData();
		form.append("file", new File(["png"], "skin.png", { type: "image/png" }));

		await api.rootClient.request({
			data: form,
			method: "put",
			url: "/api/user/profile/profile-uuid/skin",
		});

		const headers = AxiosHeaders.from(request?.headers);
		expect(headers.get("Content-Type")).toBe(false);
		expect(headers.toJSON()).not.toHaveProperty("Content-Type");
	});

	it("accepts no-content responses for versioned API delete operations", async () => {
		api.client.defaults.adapter = async (config) => ({
			config,
			data: undefined,
			headers: {},
			status: 204,
			statusText: "No Content",
		});

		await expect(
			api.delete<void>("/wardrobe/textures/2"),
		).resolves.toBeUndefined();
	});
});

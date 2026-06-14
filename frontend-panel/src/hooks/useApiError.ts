import axios from "axios";
import { toast } from "sonner";
import { i18next } from "@/i18n";
import { ApiError } from "@/services/http";

function errorCodeToMessageKey(code: string): string {
	return `errors.${code.replaceAll(".", "_")}`;
}

function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return undefined;
	}
	return typeof error.code === "string" ? error.code : undefined;
}

function getTrimmedErrorMessage(error: Error): string {
	return error.message.trim();
}

function getTransportErrorMessage(error: unknown): string | null {
	const code = getErrorCode(error);
	if (code === "ERR_CANCELED") {
		return null;
	}

	const message =
		error instanceof Error ? getTrimmedErrorMessage(error) : undefined;
	const normalizedMessage = message?.toLowerCase();
	const timedOut =
		code === "ECONNABORTED" ||
		code === "ETIMEDOUT" ||
		normalizedMessage?.includes("timeout") === true;
	if (timedOut) {
		return i18next.t("errors.request_timeout", {
			defaultValue: "Request timed out",
		});
	}

	if (axios.isAxiosError(error) && !error.response) {
		return i18next.t("errors.network_error", {
			defaultValue: "Network error",
		});
	}

	if (
		message === "Network Error" ||
		normalizedMessage === "network error" ||
		message === "Failed to fetch" ||
		message === "Load failed"
	) {
		return i18next.t("errors.network_error", {
			defaultValue: "Network error",
		});
	}

	return null;
}

export function getApiErrorMessage(error: unknown) {
	if (error instanceof ApiError) {
		const key = errorCodeToMessageKey(error.code);
		if (i18next.exists(key)) {
			return i18next.t(key);
		}
		const message = error.message.trim();
		return (
			message ||
			i18next.t("errors.unexpected_error", {
				defaultValue: "Unexpected error",
			})
		);
	}

	const transportErrorMessage = getTransportErrorMessage(error);
	if (transportErrorMessage) {
		return transportErrorMessage;
	}

	if (error instanceof Error) {
		const message = getTrimmedErrorMessage(error);
		return (
			message ||
			i18next.t("errors.unexpected_error", {
				defaultValue: "Unexpected error",
			})
		);
	}

	return i18next.t("errors.unexpected_error", {
		defaultValue: "Unexpected error",
	});
}

export function handleApiError(error: unknown) {
	toast.error(getApiErrorMessage(error));
}

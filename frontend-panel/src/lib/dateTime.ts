export function formatDateTime(value: string, locale?: string) {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return value;
	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function formatDateTimeOrFallback(
	value: string | null | undefined,
	fallback: string,
	locale?: string,
) {
	if (!value || value === "unknown") return fallback;
	return formatDateTime(value, locale);
}

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

export function formatDurationSeconds(
	value: number | null | undefined,
	fallback: string,
	locale?: string,
) {
	if (value == null || !Number.isFinite(value) || value < 0) return fallback;

	const totalSeconds = Math.floor(value);
	const units = [
		{ key: "day", seconds: 86_400 },
		{ key: "hour", seconds: 3_600 },
		{ key: "minute", seconds: 60 },
		{ key: "second", seconds: 1 },
	] as const;
	const parts: Array<{ key: (typeof units)[number]["key"]; value: number }> =
		[];
	let remaining = totalSeconds;

	for (const unit of units) {
		const amount = Math.floor(remaining / unit.seconds);
		if (amount > 0 || (unit.key === "second" && parts.length === 0)) {
			parts.push({ key: unit.key, value: amount });
		}
		remaining %= unit.seconds;
		if (parts.length >= 2) break;
	}

	const isZh = locale?.toLowerCase().startsWith("zh") ?? false;
	const formatter = new Intl.NumberFormat(locale);

	return parts
		.map((part) => {
			const number = formatter.format(part.value);
			if (isZh) {
				const labels = {
					day: "天",
					hour: "小时",
					minute: "分钟",
					second: "秒",
				} as const;
				return `${number} ${labels[part.key]}`;
			}
			const labels = {
				day: ["day", "days"],
				hour: ["hour", "hours"],
				minute: ["minute", "minutes"],
				second: ["second", "seconds"],
			} as const;
			const label =
				part.value === 1 ? labels[part.key][0] : labels[part.key][1];
			return `${number} ${label}`;
		})
		.join(" ");
}

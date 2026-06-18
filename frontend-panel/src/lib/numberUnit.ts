export type NumberUnitOption<TValue extends string = string> = {
	labelKey: string;
	multiplier: number;
	value: TValue;
};

export function parseNumberUnitValue(value: string) {
	const normalized = value.trim();
	if (!normalized) return 0;
	if (!/^\d+$/.test(normalized)) return null;

	const parsed = Number.parseInt(normalized, 10);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

export function convertNumberUnitValueToBaseUnit(
	value: string,
	unit: NumberUnitOption,
) {
	const parsed = parseNumberUnitValue(value);
	if (parsed === null) return null;
	if (!Number.isFinite(unit.multiplier) || unit.multiplier <= 0) return null;

	const converted = parsed * unit.multiplier;
	return Number.isSafeInteger(converted) && converted >= 0 ? converted : null;
}

export function formatBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KiB", "MiB", "GiB"] as const;
	let value = bytes;
	let index = 0;
	while (value >= 1024 && index < units.length - 1) {
		value /= 1024;
		index += 1;
	}
	return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

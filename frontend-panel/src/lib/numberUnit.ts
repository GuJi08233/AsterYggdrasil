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

const DEFAULT_FRACTION_DIGITS = 2;

const assertSafeInteger = (value: number, label: string) => {
	if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
};

const assertFractionDigits = (fractionDigits: number) => {
	if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) {
		throw new Error("fractionDigits must be an integer between 0 and 6");
	}
};

export const normalizeCurrencyCode = (currency: string) => {
	const normalized = currency.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(normalized)) throw new Error(`Invalid ISO currency code: ${currency}`);
	return normalized;
};

export function minorToDecimalString(amountMinor: number, fractionDigits = DEFAULT_FRACTION_DIGITS) {
	assertSafeInteger(amountMinor, "amountMinor");
	assertFractionDigits(fractionDigits);

	const divisor = 10 ** fractionDigits;
	const sign = amountMinor < 0 ? "-" : "";
	const absolute = Math.abs(amountMinor);
	const whole = Math.trunc(absolute / divisor);
	const fraction = absolute % divisor;

	if (fractionDigits === 0) return `${sign}${whole}`;
	return `${sign}${whole}.${String(fraction).padStart(fractionDigits, "0")}`;
}

export function decimalStringToMinor(value: string, fractionDigits = DEFAULT_FRACTION_DIGITS) {
	assertFractionDigits(fractionDigits);

	const trimmed = value.trim();
	const sign = trimmed.startsWith("-") ? -1 : 1;
	const unsigned = trimmed.replace(/^[+-]/, "");
	const [wholeRaw, fractionRaw = ""] = unsigned.split(".");

	if (!/^\d+$/.test(wholeRaw) || !/^\d*$/.test(fractionRaw)) {
		throw new Error(`Invalid decimal money value: ${value}`);
	}
	if (fractionRaw.length > fractionDigits) {
		throw new Error(`Money value has more than ${fractionDigits} fractional digits`);
	}

	const divisor = 10 ** fractionDigits;
	const wholeMinor = Number(wholeRaw) * divisor;
	const fractionMinor = Number(fractionRaw.padEnd(fractionDigits, "0") || "0");
	const amountMinor = sign * (wholeMinor + fractionMinor);
	assertSafeInteger(amountMinor, "amountMinor");
	return amountMinor;
}

export function formatMinorMoney(
	amountMinor: number,
	currency: string,
	locale = "en-US",
	fractionDigits = DEFAULT_FRACTION_DIGITS,
) {
	const amount = Number(minorToDecimalString(amountMinor, fractionDigits));
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: normalizeCurrencyCode(currency),
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	}).format(amount);
}

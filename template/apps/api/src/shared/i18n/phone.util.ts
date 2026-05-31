const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(input: string, defaultCountryCallingCode = "251") {
	const digits = input.trim().replace(/[^\d+]/g, "");
	const countryCode = defaultCountryCallingCode.replace(/[^\d]/g, "");
	let normalized = digits;

	if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
	if (normalized.startsWith("0")) normalized = `+${countryCode}${normalized.slice(1)}`;
	if (!normalized.startsWith("+")) {
		normalized = normalized.startsWith(countryCode) ? `+${normalized}` : `+${countryCode}${normalized}`;
	}

	if (!E164_PATTERN.test(normalized)) throw new Error(`Invalid phone number: ${input}`);
	return normalized;
}

export function maskPhoneNumber(input: string) {
	const normalized = normalizePhoneNumber(input);
	return `${normalized.slice(0, 4)}****${normalized.slice(-3)}`;
}

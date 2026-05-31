import fc from "fast-check";
import { decimalStringToMinor, minorToDecimalString, normalizeCurrencyCode } from "./money.util";

describe("money utilities", () => {
	it("round-trips safe minor-unit amounts through decimal strings", () => {
		fc.assert(
			fc.property(fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }), (amountMinor) => {
				expect(decimalStringToMinor(minorToDecimalString(amountMinor))).toBe(amountMinor);
			}),
		);
	});

	it("normalizes valid ISO currency codes", () => {
		fc.assert(
			fc.property(fc.constantFrom("usd", "ETB", " eur "), (currency) => {
				expect(normalizeCurrencyCode(currency)).toMatch(/^[A-Z]{3}$/);
			}),
		);
	});

	it("rejects values with unsupported precision", () => {
		expect(() => decimalStringToMinor("12.345")).toThrow(/fractional digits/);
		expect(() => decimalStringToMinor("abc")).toThrow(/Invalid decimal money value/);
	});
});

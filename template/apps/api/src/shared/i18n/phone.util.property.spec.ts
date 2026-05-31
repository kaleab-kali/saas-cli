import fc from "fast-check";
import { maskPhoneNumber, normalizePhoneNumber } from "./phone.util";

describe("phone utilities", () => {
	it("normalizes Ethiopian local mobile numbers to E.164", () => {
		fc.assert(
			fc.property(fc.integer({ min: 100_000_000, max: 999_999_999 }), (tail) => {
				const local = `0${tail}`;
				expect(normalizePhoneNumber(local)).toMatch(/^\+251\d{9}$/);
			}),
		);
	});

	it("keeps already-normalized E.164 numbers stable", () => {
		expect(normalizePhoneNumber("+251911000000")).toBe("+251911000000");
		expect(normalizePhoneNumber("251911000000")).toBe("+251911000000");
	});

	it("masks normalized phone numbers without exposing the middle digits", () => {
		expect(maskPhoneNumber("+251911000000")).toBe("+251••••000");
	});
});

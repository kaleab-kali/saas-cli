import fc from "fast-check";
import {
	BILLING_INTERVALS,
	FEATURE_KEYS,
	GATEWAYS,
	INVOICE_STATUSES,
	isFeatureKey,
	isPaymentMethod,
	isPlanSlug,
	LIMITED_FEATURES,
	PAYMENT_METHODS,
	PLAN_SLUGS,
	SUBSCRIPTION_STATUSES,
} from "./feature-keys.vo";
import { FEATURE_REGISTRY } from "./feature-registry";

describe("billing value object properties", () => {
	it("recognizes every declared feature key", () => {
		fc.assert(
			fc.property(fc.constantFrom(...FEATURE_KEYS), (key) => {
				expect(isFeatureKey(key)).toBe(true);
				expect(FEATURE_REGISTRY[key].key).toBe(key);
			}),
		);
	});

	it("keeps enum guard behavior equivalent to declared constants", () => {
		fc.assert(
			fc.property(fc.string(), (value) => {
				expect(isPlanSlug(value)).toBe((PLAN_SLUGS as readonly string[]).includes(value));
				expect(isPaymentMethod(value)).toBe((PAYMENT_METHODS as readonly string[]).includes(value));
			}),
		);
	});

	it("keeps declared finite lists unique", () => {
		for (const values of [
			FEATURE_KEYS,
			PLAN_SLUGS,
			BILLING_INTERVALS,
			SUBSCRIPTION_STATUSES,
			INVOICE_STATUSES,
			PAYMENT_METHODS,
			GATEWAYS,
		]) {
			expect(new Set(values).size).toBe(values.length);
		}
	});

	it("only marks limit-enforced features as limited", () => {
		for (const key of Object.keys(LIMITED_FEATURES) as Array<keyof typeof LIMITED_FEATURES>) {
			expect(isFeatureKey(key)).toBe(true);
			expect(FEATURE_REGISTRY[key].enforcement).toBe("limit");
		}
	});
});

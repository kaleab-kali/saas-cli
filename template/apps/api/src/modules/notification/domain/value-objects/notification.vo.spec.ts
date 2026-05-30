import { canBulkTransition, isCategory, isFrequency, isSeverity } from "./notification.vo";

describe("notification value objects", () => {
	it("validates generic notification categories", () => {
		expect(isCategory("system")).toBe(true);
		expect(isCategory("billing")).toBe(true);
		expect(isCategory("unknown")).toBe(false);
	});

	it("validates severity and frequency values", () => {
		expect(isSeverity("critical")).toBe(true);
		expect(isSeverity("minor")).toBe(false);
		expect(isFrequency("weekly")).toBe(true);
		expect(isFrequency("monthly")).toBe(false);
	});

	it("enforces bulk communication transitions", () => {
		expect(canBulkTransition("draft", "scheduled")).toBe(true);
		expect(canBulkTransition("draft", "sending")).toBe(true);
		expect(canBulkTransition("scheduled", "sending")).toBe(true);
		expect(canBulkTransition("scheduled", "draft")).toBe(true);
		expect(canBulkTransition("sending", "sent")).toBe(true);
		expect(canBulkTransition("sending", "failed")).toBe(true);
		expect(canBulkTransition("failed", "draft")).toBe(true);
		expect(canBulkTransition("sent", "draft")).toBe(false);
		expect(canBulkTransition("sending", "draft")).toBe(false);
		expect(canBulkTransition("failed", "sent")).toBe(false);
		expect(canBulkTransition("sent", "Stryker was here" as never)).toBe(false);
		expect(canBulkTransition("archived" as never, "Stryker was here" as never)).toBe(false);
	});
});

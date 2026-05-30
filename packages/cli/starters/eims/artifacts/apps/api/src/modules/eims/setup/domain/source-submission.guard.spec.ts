import { evaluateSourceSubmissionReadiness } from "./source-submission.guard";

describe("evaluateSourceSubmissionReadiness", () => {
	it("allows an approved and fully configured source", () => {
		const result = evaluateSourceSubmissionReadiness({
			approvalStatus: "approved",
			active: true,
			systemNumber: "SYS-1",
			credentialLastTestedAt: new Date("2026-05-26T08:00:00Z"),
			certificateValidTo: new Date("2027-05-26T08:00:00Z"),
			counterInitialized: true,
		});

		expect(result).toEqual({ ready: true, reasons: [] });
	});

	it("blocks pending, untested, or expired sources", () => {
		const result = evaluateSourceSubmissionReadiness(
			{
				approvalStatus: "pending_mor_approval",
				active: false,
				systemNumber: null,
				credentialLastTestedAt: null,
				certificateValidTo: new Date("2026-01-01T00:00:00Z"),
				counterInitialized: false,
			},
			new Date("2026-05-26T00:00:00Z"),
		);

		expect(result.ready).toBe(false);
		expect(result.reasons).toEqual(
			expect.arrayContaining([
				"source_not_approved",
				"source_inactive",
				"missing_system_number",
				"credential_not_tested",
				"certificate_expired",
				"counter_not_initialized",
			]),
		);
	});
});

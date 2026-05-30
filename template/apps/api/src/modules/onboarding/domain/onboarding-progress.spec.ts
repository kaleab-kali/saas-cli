import { calculateOnboardingProgress } from "./onboarding-progress";

describe("calculateOnboardingProgress", () => {
	it("counts completed and skipped steps and returns the current step", () => {
		expect(
			calculateOnboardingProgress([
				{ stepKey: "profile", status: "COMPLETED" },
				{ stepKey: "billing", status: "SKIPPED" },
				{ stepKey: "team", status: "IN_PROGRESS" },
				{ stepKey: "launch", status: "PENDING" },
			]),
		).toEqual({
			total: 4,
			completed: 2,
			currentStepKey: "team",
			percent: 50,
		});
	});

	it("handles an empty workflow", () => {
		expect(calculateOnboardingProgress([])).toEqual({
			total: 0,
			completed: 0,
			currentStepKey: null,
			percent: 0,
		});
	});
});

export interface OnboardingProgressStep {
	readonly stepKey: string;
	readonly status: string;
}

export interface OnboardingProgress {
	readonly total: number;
	readonly completed: number;
	readonly currentStepKey: string | null;
	readonly percent: number;
}

const COMPLETE_STATUSES = new Set(["COMPLETED", "SKIPPED"]);

export function calculateOnboardingProgress(steps: readonly OnboardingProgressStep[]): OnboardingProgress {
	const total = steps.length;
	const completed = steps.filter((step) => COMPLETE_STATUSES.has(step.status)).length;
	const currentStepKey = steps.find((step) => step.status === "IN_PROGRESS")?.stepKey ?? null;

	return {
		total,
		completed,
		currentStepKey,
		percent: total === 0 ? 0 : Math.round((completed / total) * 100),
	};
}

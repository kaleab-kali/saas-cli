export class OnboardingStepCompletedEvent {
	constructor(
		readonly taskId: string,
		readonly stepKey: string,
		readonly userId: string | null,
	) {}
}

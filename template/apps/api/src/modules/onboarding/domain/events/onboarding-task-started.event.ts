export class OnboardingTaskStartedEvent {
	constructor(
		readonly taskId: string,
		readonly organizationId: string,
		readonly templateKey: string,
	) {}
}

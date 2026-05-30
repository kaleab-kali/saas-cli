export class OnboardingTaskBlockedEvent {
	constructor(
		readonly taskId: string,
		readonly reason: string,
		readonly userId: string | null,
	) {}
}

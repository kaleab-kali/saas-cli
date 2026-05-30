import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OnboardingService } from "../../application/onboarding.service";

@Injectable()
export class StaleOnboardingCron {
	private readonly logger = new Logger(StaleOnboardingCron.name);

	constructor(private readonly onboarding: OnboardingService) {}

	@Cron(CronExpression.EVERY_DAY_AT_8AM)
	async reportStaleTasks() {
		const tasks = await this.onboarding.listStuckTasks();
		if (tasks.length === 0) return;

		this.logger.warn(
			{ taskIds: tasks.map((task) => task.id) },
			`${tasks.length} onboarding task(s) have been in their current step for too long`,
		);
	}
}

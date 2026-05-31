import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreateNotificationHandler } from "#modules/notification/application/commands/create-notification/create-notification.handler";
import { OnboardingService } from "../../application/onboarding.service";

@Injectable()
export class StaleOnboardingCron {
	private readonly logger = new Logger(StaleOnboardingCron.name);

	constructor(
		private readonly onboarding: OnboardingService,
		private readonly notifications: CreateNotificationHandler,
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_8AM)
	async reportStaleTasks() {
		const tasks = await this.onboarding.listStuckTasks();
		if (tasks.length === 0) return;

		let notified = 0;
		for (const task of tasks) {
			if (!task.assignedToUserId) continue;
			try {
				await this.notifications.execute(task.organizationId, {
					userId: task.assignedToUserId,
					category: "system",
					severity: "warning",
					title: "Onboarding task is stuck",
					body: `${task.contactName} has been waiting on ${task.currentStepKey ?? "the current step"} for too long.`,
					linkUrl: `/admin/onboarding/${task.id}`,
					sourceEvent: "onboarding.task.stale",
					sourceRef: task.id,
				});
				notified += 1;
			} catch (error) {
				this.logger.error(
					error instanceof Error ? error.message : String(error),
					`Failed to notify assignee for stale onboarding task ${task.id}`,
				);
			}
		}

		this.logger.warn(
			{ notified, taskIds: tasks.map((task) => task.id) },
			`${tasks.length} onboarding task(s) have been in their current step for too long`,
		);
	}
}

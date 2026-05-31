jest.mock("#modules/notification/application/commands/create-notification/create-notification.handler", () => ({
	CreateNotificationHandler: class CreateNotificationHandler {},
}));

import { StaleOnboardingCron } from "./stale-onboarding.cron";

describe("StaleOnboardingCron", () => {
	it("notifies assigned staff when onboarding tasks stay stuck", async () => {
		const onboarding = {
			listStuckTasks: jest.fn().mockResolvedValue([
				{
					id: "task_stale_1",
					organizationId: "org_1",
					assignedToUserId: "staff_1",
					contactName: "Demo Cafe",
					currentStepKey: "mor-portal-signup",
				},
				{
					id: "task_stale_unassigned",
					organizationId: "org_2",
					assignedToUserId: null,
					contactName: "Unassigned Tenant",
					currentStepKey: "payment-received",
				},
			]),
		};
		const notifications = { execute: jest.fn().mockResolvedValue({ id: "notification_1" }) };
		const cron = new StaleOnboardingCron(onboarding as never, notifications as never);

		await cron.reportStaleTasks();

		expect(onboarding.listStuckTasks).toHaveBeenCalledWith();
		expect(notifications.execute).toHaveBeenCalledTimes(1);
		expect(notifications.execute).toHaveBeenCalledWith(
			"org_1",
			expect.objectContaining({
				body: expect.stringContaining("mor-portal-signup"),
				category: "system",
				linkUrl: "/admin/onboarding/task_stale_1",
				severity: "warning",
				sourceEvent: "onboarding.task.stale",
				sourceRef: "task_stale_1",
				title: "Onboarding task is stuck",
				userId: "staff_1",
			}),
		);
	});

	it("does not notify when no tasks are stale", async () => {
		const onboarding = { listStuckTasks: jest.fn().mockResolvedValue([]) };
		const notifications = { execute: jest.fn() };
		const cron = new StaleOnboardingCron(onboarding as never, notifications as never);

		await cron.reportStaleTasks();

		expect(notifications.execute).not.toHaveBeenCalled();
	});
});

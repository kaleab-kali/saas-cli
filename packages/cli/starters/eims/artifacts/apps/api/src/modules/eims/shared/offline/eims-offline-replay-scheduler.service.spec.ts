import { EimsOfflineReplaySchedulerService } from "./eims-offline-replay-scheduler.service";

describe("EimsOfflineReplaySchedulerService", () => {
	it("does not enqueue replay jobs until the scheduler is explicitly enabled", async () => {
		const pendingSync = { listPendingOrganizations: jest.fn() };
		const offlineReplayQueue = { enqueueReplay: jest.fn() };
		const scheduler = new EimsOfflineReplaySchedulerService(pendingSync as never, offlineReplayQueue as never, {
			schedulerEnabled: false,
		});

		await expect(scheduler.schedulePendingReplay()).resolves.toEqual({
			scheduled: false,
			reason: "Set EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED=true to enqueue pending offline replay jobs",
		});
		expect(pendingSync.listPendingOrganizations).not.toHaveBeenCalled();
		expect(offlineReplayQueue.enqueueReplay).not.toHaveBeenCalled();
	});

	it("enqueues one offline replay job per organization with durable pending records", async () => {
		const pendingSync = { listPendingOrganizations: jest.fn().mockResolvedValue(["org_1", "org_2"]) };
		const offlineReplayQueue = {
			enqueueReplay: jest
				.fn()
				.mockResolvedValueOnce({ queued: true, jobId: "job_1" })
				.mockResolvedValueOnce({ queued: true, jobId: "job_2" }),
		};
		const scheduler = new EimsOfflineReplaySchedulerService(pendingSync as never, offlineReplayQueue as never, {
			schedulerEnabled: true,
			batchLimit: 7,
			organizationLimit: 25,
		});

		await expect(scheduler.schedulePendingReplay()).resolves.toEqual({
			scheduled: true,
			organizationCount: 2,
			queueName: "eims-offline-replay",
			jobs: [
				{ queued: true, jobId: "job_1" },
				{ queued: true, jobId: "job_2" },
			],
		});
		expect(pendingSync.listPendingOrganizations).toHaveBeenCalledWith(25);
		expect(offlineReplayQueue.enqueueReplay).toHaveBeenNthCalledWith(1, "org_1", { limit: 7 });
		expect(offlineReplayQueue.enqueueReplay).toHaveBeenNthCalledWith(2, "org_2", { limit: 7 });
	});
});

import { BadRequestException } from "@nestjs/common";
import { EIMS_OFFLINE_REPLAY_QUEUE, EimsOfflineReplayQueueService } from "./eims-offline-replay-queue.service";

describe("EimsOfflineReplayQueueService", () => {
	it("reports disabled status without Redis worker configuration", async () => {
		const replay = { replayOne: jest.fn(), replayPending: jest.fn() };
		const service = new EimsOfflineReplayQueueService(replay as never, { redisUrl: "", workersEnabled: false });

		await expect(service.enqueueReplay("org_1", { offlineId: "offline_1" })).resolves.toEqual({
			queued: false,
			enabled: false,
			queueName: EIMS_OFFLINE_REPLAY_QUEUE,
			reason: "Set REDIS_URL and EIMS_WORKERS_ENABLED=true to enable offline replay workers",
		});
	});

	it("enqueues tenant-scoped offline replay jobs with deterministic job ids", async () => {
		const replay = { replayOne: jest.fn(), replayPending: jest.fn() };
		const queue = {
			add: jest.fn().mockResolvedValue({ id: "job_1" }),
		};
		const service = new EimsOfflineReplayQueueService(replay as never, {
			redisUrl: "redis://127.0.0.1:6379",
			workersEnabled: true,
			queue,
		});

		await expect(service.enqueueReplay("org_1", { offlineId: "offline_1" })).resolves.toEqual({
			queued: true,
			queueName: EIMS_OFFLINE_REPLAY_QUEUE,
			jobId: "job_1",
			jobName: "offline-replay-one",
		});
		expect(queue.add).toHaveBeenCalledWith(
			"offline-replay-one",
			{ organizationId: "org_1", offlineId: "offline_1", limit: undefined },
			expect.objectContaining({
				attempts: 5,
				jobId: "org_1:offline_1",
			}),
		);
	});

	it("processes one-off and batch jobs through the existing SDK-bound replay service", async () => {
		const replay = {
			replayOne: jest.fn().mockResolvedValue({ replayStatus: "synced" }),
			replayPending: jest.fn().mockResolvedValue([{ replayStatus: "retryable" }]),
		};
		const service = new EimsOfflineReplayQueueService(replay as never, { redisUrl: "", workersEnabled: false });

		await expect(service.processReplayJob({ organizationId: "org_1", offlineId: "offline_1" })).resolves.toEqual({
			replayStatus: "synced",
		});
		await expect(service.processReplayJob({ organizationId: "org_1", limit: 3 })).resolves.toEqual([
			{ replayStatus: "retryable" },
		]);
		expect(replay.replayOne).toHaveBeenCalledWith("org_1", "offline_1");
		expect(replay.replayPending).toHaveBeenCalledWith("org_1", 3);
	});

	it("rejects worker jobs without tenant scope", async () => {
		const service = new EimsOfflineReplayQueueService({ replayOne: jest.fn(), replayPending: jest.fn() } as never);

		await expect(service.processReplayJob({ organizationId: "" })).rejects.toBeInstanceOf(BadRequestException);
	});
});

import { BadRequestException } from "@nestjs/common";
import {
	EIMS_BULK_RECONCILIATION_QUEUE,
	EimsBulkReconciliationQueueService,
} from "./eims-bulk-reconciliation-queue.service";

describe("EimsBulkReconciliationQueueService", () => {
	it("reports disabled status without Redis worker configuration", async () => {
		const polling = { pollConversation: jest.fn() };
		const service = new EimsBulkReconciliationQueueService(polling as never, { redisUrl: "", workersEnabled: false });

		await expect(
			service.enqueueReconciliation({ organizationId: "org_1", conversationId: "BATCH-1" }),
		).resolves.toEqual({
			queued: false,
			enabled: false,
			queueName: EIMS_BULK_RECONCILIATION_QUEUE,
			reason: "Set REDIS_URL and EIMS_WORKERS_ENABLED=true to enable bulk reconciliation workers",
		});
	});

	it("enqueues tenant-scoped bulk reconciliation jobs with deterministic job ids", async () => {
		const polling = { pollConversation: jest.fn() };
		const queue = {
			add: jest.fn().mockResolvedValue({ id: "job_1" }),
		};
		const service = new EimsBulkReconciliationQueueService(polling as never, {
			redisUrl: "redis://127.0.0.1:6379",
			workersEnabled: true,
			queue,
		});

		await expect(
			service.enqueueReconciliation({ organizationId: "org_1", conversationId: "BATCH-1" }),
		).resolves.toEqual({
			queued: true,
			queueName: EIMS_BULK_RECONCILIATION_QUEUE,
			jobId: "job_1",
			jobName: "bulk-reconciliation-poll",
		});
		expect(queue.add).toHaveBeenCalledWith(
			"bulk-reconciliation-poll",
			{ organizationId: "org_1", conversationId: "BATCH-1" },
			expect.objectContaining({
				attempts: 5,
				jobId: "org_1:BATCH-1",
			}),
		);
	});

	it("processes jobs through the SDK-bound bulk polling service", async () => {
		const polling = {
			pollConversation: jest.fn().mockResolvedValue({ data: { status: "processing" } }),
		};
		const service = new EimsBulkReconciliationQueueService(polling as never, { redisUrl: "", workersEnabled: false });

		await expect(
			service.processReconciliationJob({
				organizationId: "org_1",
				conversationId: "BATCH-1",
				sourceSystemId: "src_1",
			}),
		).resolves.toEqual({ data: { status: "processing" } });
		expect(polling.pollConversation).toHaveBeenCalledWith({
			organizationId: "org_1",
			conversationId: "BATCH-1",
			sourceSystemId: "src_1",
		});
	});

	it("rejects worker jobs without tenant or conversation scope", async () => {
		const service = new EimsBulkReconciliationQueueService({ pollConversation: jest.fn() } as never);

		await expect(
			service.processReconciliationJob({ organizationId: "", conversationId: "BATCH-1" }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service.processReconciliationJob({ organizationId: "org_1", conversationId: "" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});

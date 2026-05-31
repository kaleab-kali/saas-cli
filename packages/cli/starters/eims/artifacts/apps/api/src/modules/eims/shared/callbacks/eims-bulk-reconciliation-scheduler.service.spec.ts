import { EimsBulkReconciliationSchedulerService } from "./eims-bulk-reconciliation-scheduler.service";

describe("EimsBulkReconciliationSchedulerService", () => {
	it("does not schedule bulk polling until explicitly enabled", async () => {
		const receipts = { listPendingPollingConversations: jest.fn() };
		const queue = { enqueueReconciliation: jest.fn() };
		const scheduler = new EimsBulkReconciliationSchedulerService(receipts as never, queue as never, {
			schedulerEnabled: false,
		});

		await expect(scheduler.schedulePendingPolling()).resolves.toEqual({
			scheduled: false,
			reason: "Set EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED=true to enqueue bulk polling jobs",
		});
		expect(receipts.listPendingPollingConversations).not.toHaveBeenCalled();
	});

	it("enqueues pending durable conversations for SDK-bound polling", async () => {
		const receipts = {
			listPendingPollingConversations: jest.fn().mockResolvedValue([
				{
					organizationId: "org_1",
					conversationId: "BATCH-1",
					submitted: 2,
					pending: 2,
					processedAt: "2026-05-26T10:00:00.000Z",
				},
			]),
		};
		const queue = {
			enqueueReconciliation: jest.fn().mockResolvedValue({ queued: true, jobId: "job_1" }),
		};
		const scheduler = new EimsBulkReconciliationSchedulerService(receipts as never, queue as never, {
			schedulerEnabled: true,
			batchLimit: 10,
		});

		await expect(scheduler.schedulePendingPolling()).resolves.toEqual({
			scheduled: true,
			conversationCount: 1,
			queueName: "eims-bulk-callback",
			jobs: [{ queued: true, jobId: "job_1" }],
		});
		expect(receipts.listPendingPollingConversations).toHaveBeenCalledWith(10);
		expect(queue.enqueueReconciliation).toHaveBeenCalledWith({
			organizationId: "org_1",
			conversationId: "BATCH-1",
		});
	});
});

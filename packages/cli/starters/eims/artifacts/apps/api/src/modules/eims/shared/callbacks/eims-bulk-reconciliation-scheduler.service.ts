import { Injectable, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EimsBulkReconciliationQueueService } from "../queues/eims-bulk-reconciliation-queue.service";
import { EimsBulkCallbackPersistenceService } from "./eims-bulk-callback-persistence.service";

interface EimsBulkReconciliationSchedulerOptions {
	schedulerEnabled?: boolean;
	batchLimit?: number;
}

@Injectable()
export class EimsBulkReconciliationSchedulerService {
	constructor(
		private readonly receipts: EimsBulkCallbackPersistenceService,
		private readonly reconciliationQueue: EimsBulkReconciliationQueueService,
		@Optional()
		private readonly options?: EimsBulkReconciliationSchedulerOptions,
	) {}

	@Cron(CronExpression.EVERY_MINUTE, { name: "eims.bulkReconciliation.schedule" })
	async schedulePendingPolling() {
		if (!this.schedulerEnabled()) {
			return {
				scheduled: false,
				reason: "Set EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED=true to enqueue bulk polling jobs",
			};
		}

		const conversations = await this.receipts.listPendingPollingConversations(this.batchLimit());
		const jobs = [];
		for (const conversation of conversations) {
			jobs.push(
				await this.reconciliationQueue.enqueueReconciliation({
					organizationId: conversation.organizationId,
					conversationId: conversation.conversationId,
				}),
			);
		}
		return {
			scheduled: true,
			conversationCount: conversations.length,
			queueName: "eims-bulk-callback",
			jobs,
		};
	}

	private schedulerEnabled() {
		return this.options?.schedulerEnabled ?? process.env.EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED === "true";
	}

	private batchLimit() {
		const parsed = Number(this.options?.batchLimit ?? process.env.EIMS_BULK_RECONCILIATION_BATCH_LIMIT);
		return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 25;
	}
}

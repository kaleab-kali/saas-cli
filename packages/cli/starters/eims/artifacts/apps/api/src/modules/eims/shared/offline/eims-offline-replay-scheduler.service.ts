import { Injectable, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EimsOfflineReplayQueueService } from "../queues/eims-offline-replay-queue.service";
import { EimsOfflinePendingSyncPersistenceService } from "./eims-offline-pending-sync-persistence.service";

interface EimsOfflineReplaySchedulerOptions {
	schedulerEnabled?: boolean;
	batchLimit?: number;
	organizationLimit?: number;
}

@Injectable()
export class EimsOfflineReplaySchedulerService {
	constructor(
		private readonly pendingSync: EimsOfflinePendingSyncPersistenceService,
		private readonly offlineReplayQueue: EimsOfflineReplayQueueService,
		@Optional()
		private readonly options?: EimsOfflineReplaySchedulerOptions,
	) {}

	@Cron(CronExpression.EVERY_MINUTE, { name: "eims.offlineReplay.schedule" })
	async schedulePendingReplay() {
		if (!this.schedulerEnabled()) {
			return {
				scheduled: false,
				reason: "Set EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED=true to enqueue pending offline replay jobs",
			};
		}

		const organizationIds = await this.pendingSync.listPendingOrganizations(this.organizationLimit());
		const jobs = [];
		for (const organizationId of organizationIds) {
			jobs.push(await this.offlineReplayQueue.enqueueReplay(organizationId, { limit: this.batchLimit() }));
		}
		return {
			scheduled: true,
			organizationCount: organizationIds.length,
			queueName: "eims-offline-replay",
			jobs,
		};
	}

	private schedulerEnabled() {
		return this.options?.schedulerEnabled ?? process.env.EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED === "true";
	}

	private batchLimit() {
		return this.positiveNumber(this.options?.batchLimit ?? process.env.EIMS_OFFLINE_REPLAY_BATCH_LIMIT, 10);
	}

	private organizationLimit() {
		return this.positiveNumber(
			this.options?.organizationLimit ?? process.env.EIMS_OFFLINE_REPLAY_ORGANIZATION_LIMIT,
			50,
		);
	}

	private positiveNumber(value: unknown, fallback: number) {
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}
}

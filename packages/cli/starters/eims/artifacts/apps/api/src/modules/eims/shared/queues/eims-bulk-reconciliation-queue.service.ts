import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { EimsBulkReconciliationPollingService } from "../callbacks/eims-bulk-reconciliation-polling.service";

export const EIMS_BULK_RECONCILIATION_QUEUE = "eims-bulk-callback";

export interface EimsBulkReconciliationJobInput {
	organizationId: string;
	conversationId: string;
	sourceSystemId?: string;
}

interface QueueLike {
	add(
		name: string,
		data: EimsBulkReconciliationJobInput,
		options: Record<string, unknown>,
	): Promise<{ id?: string | number }>;
	close?(): Promise<void>;
}

interface WorkerLike {
	close(): Promise<void>;
}

interface EimsBulkReconciliationQueueOptions {
	redisUrl?: string;
	workersEnabled?: boolean;
	queue?: QueueLike;
	worker?: WorkerLike;
}

@Injectable()
export class EimsBulkReconciliationQueueService implements OnModuleInit, OnModuleDestroy {
	private connection: IORedis | null = null;
	private queueInstance: QueueLike | null = null;
	private workerInstance: WorkerLike | null = null;

	constructor(
		private readonly polling: EimsBulkReconciliationPollingService,
		@Optional()
		private readonly options?: EimsBulkReconciliationQueueOptions,
	) {}

	async onModuleInit() {
		if (!this.workersEnabled() || !this.redisUrl()) return;
		this.workerInstance =
			this.options?.worker ??
			new Worker(EIMS_BULK_RECONCILIATION_QUEUE, (job) => this.processReconciliationJob(job.data), {
				connection: this.redis(),
				prefix: process.env.BULLMQ_PREFIX || undefined,
			});
	}

	async onModuleDestroy() {
		await this.workerInstance?.close();
		await this.queueInstance?.close?.();
		if (this.connection) await this.connection.quit();
	}

	status() {
		const redisUrl = this.redisUrl();
		const enabled = Boolean(redisUrl) && this.workersEnabled();
		return {
			enabled,
			queueName: EIMS_BULK_RECONCILIATION_QUEUE,
			reason: enabled ? null : "Set REDIS_URL and EIMS_WORKERS_ENABLED=true to enable bulk reconciliation workers",
		};
	}

	async enqueueReconciliation(input: EimsBulkReconciliationJobInput) {
		const queue = this.queue();
		if (!queue) {
			return {
				queued: false,
				...this.status(),
			};
		}

		const job = await queue.add("bulk-reconciliation-poll", input, {
			attempts: this.attempts(),
			backoff: { type: "exponential", delay: 30_000 },
			removeOnComplete: 100,
			removeOnFail: 500,
			jobId: `${input.organizationId}:${input.conversationId}`,
		});
		return {
			queued: true,
			queueName: EIMS_BULK_RECONCILIATION_QUEUE,
			jobId: job.id ? String(job.id) : null,
			jobName: "bulk-reconciliation-poll",
		};
	}

	async processReconciliationJob(data: EimsBulkReconciliationJobInput) {
		if (!data.organizationId)
			throw new BadRequestException("organizationId is required for EIMS bulk reconciliation jobs");
		if (!data.conversationId)
			throw new BadRequestException("conversationId is required for EIMS bulk reconciliation jobs");
		return this.polling.pollConversation({
			organizationId: data.organizationId,
			conversationId: data.conversationId,
			sourceSystemId: data.sourceSystemId,
		});
	}

	private queue() {
		if (this.options?.queue) return this.options.queue;
		if (!this.redisUrl()) return null;
		if (!this.queueInstance) {
			this.queueInstance = new Queue(EIMS_BULK_RECONCILIATION_QUEUE, {
				connection: this.redis(),
				prefix: process.env.BULLMQ_PREFIX || undefined,
			});
		}
		return this.queueInstance;
	}

	private redis() {
		if (!this.connection) {
			this.connection = new IORedis(this.redisUrl() as string, {
				maxRetriesPerRequest: null,
			});
		}
		return this.connection;
	}

	private redisUrl() {
		return this.options?.redisUrl ?? process.env.REDIS_URL;
	}

	private workersEnabled() {
		return this.options?.workersEnabled ?? process.env.EIMS_WORKERS_ENABLED === "true";
	}

	private attempts() {
		const configured = Number(process.env.EIMS_BULK_RECONCILIATION_ATTEMPTS ?? 5);
		return Number.isFinite(configured) && configured > 0 ? configured : 5;
	}
}

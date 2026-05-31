import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { EimsOfflineReplayService } from "../offline/eims-offline-replay.service";

export const EIMS_OFFLINE_REPLAY_QUEUE = "eims-offline-replay";

export interface EimsOfflineReplayJobInput {
	offlineId?: string;
	limit?: number;
}

interface EimsOfflineReplayJobData extends EimsOfflineReplayJobInput {
	organizationId: string;
}

interface QueueLike {
	add(
		name: string,
		data: EimsOfflineReplayJobData,
		options: Record<string, unknown>,
	): Promise<{ id?: string | number }>;
	close?(): Promise<void>;
}

interface WorkerLike {
	close(): Promise<void>;
}

interface EimsOfflineReplayQueueOptions {
	redisUrl?: string;
	workersEnabled?: boolean;
	queue?: QueueLike;
	worker?: WorkerLike;
}

@Injectable()
export class EimsOfflineReplayQueueService implements OnModuleInit, OnModuleDestroy {
	private connection: IORedis | null = null;
	private queueInstance: QueueLike | null = null;
	private workerInstance: WorkerLike | null = null;

	constructor(
		private readonly offlineReplay: EimsOfflineReplayService,
		@Optional()
		private readonly options?: EimsOfflineReplayQueueOptions,
	) {}

	async onModuleInit() {
		if (!this.workersEnabled() || !this.redisUrl()) return;
		this.workerInstance =
			this.options?.worker ??
			new Worker(EIMS_OFFLINE_REPLAY_QUEUE, (job) => this.processReplayJob(job.data), {
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
			queueName: EIMS_OFFLINE_REPLAY_QUEUE,
			reason: enabled ? null : "Set REDIS_URL and EIMS_WORKERS_ENABLED=true to enable offline replay workers",
		};
	}

	async enqueueReplay(organizationId: string, input: EimsOfflineReplayJobInput = {}) {
		const queue = this.queue();
		if (!queue) {
			return {
				queued: false,
				...this.status(),
			};
		}
		const data: EimsOfflineReplayJobData = {
			organizationId,
			offlineId: input.offlineId,
			limit: input.limit,
		};
		const jobName = input.offlineId ? "offline-replay-one" : "offline-replay-batch";
		const job = await queue.add(jobName, data, {
			attempts: this.attempts(),
			backoff: { type: "exponential", delay: 30_000 },
			removeOnComplete: 100,
			removeOnFail: 500,
			jobId: input.offlineId ? `${organizationId}:${input.offlineId}` : undefined,
		});
		return {
			queued: true,
			queueName: EIMS_OFFLINE_REPLAY_QUEUE,
			jobId: job.id ? String(job.id) : null,
			jobName,
		};
	}

	async processReplayJob(data: EimsOfflineReplayJobData) {
		if (!data.organizationId) throw new BadRequestException("organizationId is required for EIMS offline replay jobs");
		if (data.offlineId) return this.offlineReplay.replayOne(data.organizationId, data.offlineId);
		return this.offlineReplay.replayPending(data.organizationId, data.limit);
	}

	private queue() {
		if (this.options?.queue) return this.options.queue;
		if (!this.redisUrl()) return null;
		if (!this.queueInstance) {
			this.queueInstance = new Queue(EIMS_OFFLINE_REPLAY_QUEUE, {
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
		const configured = Number(process.env.EIMS_OFFLINE_REPLAY_ATTEMPTS ?? 5);
		return Number.isFinite(configured) && configured > 0 ? configured : 5;
	}
}

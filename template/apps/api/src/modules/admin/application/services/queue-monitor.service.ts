import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";

type QueueCounts = Record<"active" | "completed" | "delayed" | "failed" | "paused" | "prioritized" | "waiting", number>;

@Injectable()
export class QueueMonitorService implements OnModuleDestroy {
	private connection: IORedis | null = null;
	private readonly queues = new Map<string, Queue>();

	async listQueues() {
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) {
			return { enabled: false, reason: "REDIS_URL is not set", queues: [] };
		}
		const names = this.queueNames();
		const queues = await Promise.all(names.map((name) => this.inspectQueue(name)));
		return { enabled: true, reason: null, queues };
	}

	async retryFailedJob(queueName: string, jobId: string) {
		const queue = this.queue(queueName);
		const job = await queue.getJob(jobId);
		if (!job) return null;
		await job.retry();
		return {
			id: String(job.id),
			name: job.name,
			queueName,
			retried: true,
		};
	}

	async onModuleDestroy() {
		await Promise.all([...this.queues.values()].map((queue) => queue.close()));
		if (this.connection) await this.connection.quit();
	}

	private async inspectQueue(name: string) {
		const queue = this.queue(name);
		const counts = (await queue.getJobCounts(
			"waiting",
			"active",
			"completed",
			"failed",
			"delayed",
			"paused",
			"prioritized",
		)) as QueueCounts;
		const failed = await queue.getJobs(["failed"], 0, 4, false);
		return {
			name,
			counts,
			failed: failed.map((job) => ({
				id: String(job.id),
				name: job.name,
				failedReason: job.failedReason ?? null,
				attemptsMade: job.attemptsMade,
				timestamp: job.timestamp,
			})),
		};
	}

	private queue(name: string) {
		const existing = this.queues.get(name);
		if (existing) return existing;
		const queue = new Queue(name, {
			connection: this.redis(),
			prefix: process.env.BULLMQ_PREFIX || undefined,
		});
		this.queues.set(name, queue);
		return queue;
	}

	private redis() {
		if (!this.connection) {
			this.connection = new IORedis(process.env.REDIS_URL as string, {
				maxRetriesPerRequest: null,
			});
		}
		return this.connection;
	}

	private queueNames() {
		return (process.env.BULLMQ_QUEUES || "billing,notifications,reports")
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean);
	}
}

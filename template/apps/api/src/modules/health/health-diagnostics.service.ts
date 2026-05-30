import { statfs } from "node:fs/promises";
import * as os from "node:os";
import { Injectable } from "@nestjs/common";
import IORedis from "ioredis";
import { PrismaService } from "#shared/database/prisma.service";
import { MetricsService } from "#shared/metrics/metrics.service";

export type DependencyState = "up" | "down" | "skipped";
export type HealthStatus = "ok" | "degraded" | "error";

export interface DependencyCheck {
	status: DependencyState;
	latencyMs: number;
	error?: string;
	reason?: string;
}

export interface DetailedHealthPayload {
	status: HealthStatus;
	timestamp: string;
	app: {
		name: string;
		nodeEnv: string;
		uptimeSeconds: number;
		pid: number;
		nodeVersion: string;
	};
	host: {
		platform: string;
		arch: string;
		hostname: string;
		cpus: number;
		load1m: number;
		load5m: number;
		load15m: number;
		totalMemoryBytes: number;
		freeMemoryBytes: number;
	};
	process: {
		rssBytes: number;
		heapUsedBytes: number;
		heapTotalBytes: number;
		externalBytes: number;
	};
	http: ReturnType<MetricsService["snapshot"]>;
	dependencies: {
		database: DependencyCheck;
		redis: DependencyCheck;
		disk: DependencyCheck & { freeBytes?: number; totalBytes?: number; usedPercent?: number };
		memory: DependencyCheck & { freeBytes?: number; totalBytes?: number; usedPercent?: number };
		eims: DependencyCheck;
	};
	jobs: {
		status: Exclude<DependencyState, "skipped">;
		failedLast5m: number;
		recentRuns: Array<{
			id: string;
			jobName: string;
			status: string;
			startedAt: Date;
			finishedAt: Date | null;
			durationMs: number | null;
			summary: string | null;
			errorMessage: string | null;
		}>;
	};
}

@Injectable()
export class HealthDiagnosticsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly metrics: MetricsService,
	) {}

	async readiness() {
		const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
		return {
			status: [database, redis].some((dependency) => dependency.status === "down") ? "error" : "ok",
			timestamp: new Date().toISOString(),
			dependencies: {
				database,
				redis,
			},
		};
	}

	async detailed(): Promise<DetailedHealthPayload> {
		const [database, redis, disk, memory, eims, jobs] = await Promise.all([
			this.checkDatabase(),
			this.checkRedis(),
			this.checkDisk(),
			this.checkMemory(),
			this.checkEimsReachability(),
			this.checkJobs(),
		]);
		const processMemory = process.memoryUsage();
		const load = os.loadavg();
		const criticalChecks = [database, disk, memory];
		const optionalChecks = [redis, eims];
		const status: HealthStatus = criticalChecks.some((dependency) => dependency.status === "down")
			? "error"
			: optionalChecks.some((dependency) => dependency.status === "down") || jobs.status === "down"
				? "degraded"
				: "ok";

		return {
			status,
			timestamp: new Date().toISOString(),
			app: {
				name: process.env.APP_NAME ?? "SaaS",
				nodeEnv: process.env.NODE_ENV ?? "development",
				uptimeSeconds: Math.round(process.uptime()),
				pid: process.pid,
				nodeVersion: process.version,
			},
			host: {
				platform: os.platform(),
				arch: os.arch(),
				hostname: os.hostname(),
				cpus: os.cpus().length,
				load1m: load[0],
				load5m: load[1],
				load15m: load[2],
				totalMemoryBytes: os.totalmem(),
				freeMemoryBytes: os.freemem(),
			},
			process: {
				rssBytes: processMemory.rss,
				heapUsedBytes: processMemory.heapUsed,
				heapTotalBytes: processMemory.heapTotal,
				externalBytes: processMemory.external,
			},
			http: this.metrics.snapshot(),
			dependencies: {
				database,
				redis,
				disk,
				memory,
				eims,
			},
			jobs,
		};
	}

	async checkDatabase(): Promise<DependencyCheck> {
		const started = Date.now();
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { status: "up", latencyMs: Date.now() - started };
		} catch (error) {
			return {
				status: "down",
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async checkRedis(): Promise<DependencyCheck> {
		const started = Date.now();
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) {
			return { status: "skipped", latencyMs: 0, reason: "REDIS_URL is not set" };
		}
		const redis = new IORedis(redisUrl, {
			connectTimeout: Number(process.env.HEALTH_REDIS_TIMEOUT_MS ?? 1000),
			lazyConnect: true,
			maxRetriesPerRequest: 0,
		});
		try {
			await redis.connect();
			await redis.ping();
			return { status: "up", latencyMs: Date.now() - started };
		} catch (error) {
			return {
				status: "down",
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			redis.disconnect();
		}
	}

	private async checkDisk(): Promise<DetailedHealthPayload["dependencies"]["disk"]> {
		const started = Date.now();
		try {
			const stats = await statfs(process.cwd());
			const totalBytes = Number(stats.blocks) * Number(stats.bsize);
			const freeBytes = Number(stats.bavail) * Number(stats.bsize);
			const minFreeBytes = Number(process.env.HEALTH_MIN_FREE_DISK_BYTES ?? 100 * 1024 * 1024);
			return {
				status: freeBytes >= minFreeBytes ? "up" : "down",
				latencyMs: Date.now() - started,
				freeBytes,
				totalBytes,
				usedPercent: totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 10_000) / 100 : 0,
				...(freeBytes >= minFreeBytes ? {} : { reason: `Free disk below ${minFreeBytes} bytes` }),
			};
		} catch (error) {
			return {
				status: "down",
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async checkMemory(): Promise<DetailedHealthPayload["dependencies"]["memory"]> {
		const totalBytes = os.totalmem();
		const freeBytes = os.freemem();
		const minFreeBytes = Number(process.env.HEALTH_MIN_FREE_MEMORY_BYTES ?? 128 * 1024 * 1024);
		return {
			status: freeBytes >= minFreeBytes ? "up" : "down",
			latencyMs: 0,
			freeBytes,
			totalBytes,
			usedPercent: totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 10_000) / 100 : 0,
			...(freeBytes >= minFreeBytes ? {} : { reason: `Free memory below ${minFreeBytes} bytes` }),
		};
	}

	private async checkEimsReachability(): Promise<DependencyCheck> {
		const url =
			process.env.EIMS_API_URL ?? process.env.EIMS_BASE_URL_PRODUCTION ?? process.env.EIMS_BASE_URL_SANDBOX ?? "";
		if (!url) {
			return { status: "skipped", latencyMs: 0, reason: "EIMS endpoint is not configured" };
		}

		const started = Date.now();
		try {
			const response = await fetch(url, {
				method: "HEAD",
				signal: AbortSignal.timeout(Number(process.env.HEALTH_EIMS_TIMEOUT_MS ?? 1500)),
			});
			return {
				status: response.ok ? "up" : "down",
				latencyMs: Date.now() - started,
				...(response.ok ? {} : { error: `EIMS endpoint returned ${response.status}` }),
			};
		} catch (error) {
			return {
				status: "down",
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async checkJobs(): Promise<DetailedHealthPayload["jobs"]> {
		const failedLast5m = await this.prisma.cronJobRun.count({
			where: {
				status: "failed",
				startedAt: { gte: new Date(Date.now() - 5 * 60_000) },
			},
		});
		const recentRuns = await this.prisma.cronJobRun.findMany({
			orderBy: { startedAt: "desc" },
			take: 10,
			select: {
				id: true,
				jobName: true,
				status: true,
				startedAt: true,
				finishedAt: true,
				durationMs: true,
				summary: true,
				errorMessage: true,
			},
		});

		return {
			status: failedLast5m > 0 ? "down" : "up",
			failedLast5m,
			recentRuns,
		};
	}
}

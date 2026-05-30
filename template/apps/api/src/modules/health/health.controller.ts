import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import IORedis from "ioredis";
import { PrismaService } from "#shared/database/prisma.service";

type DependencyState = "up" | "down" | "skipped";

interface DependencyCheck {
	status: DependencyState;
	latencyMs: number;
	error?: string;
	reason?: string;
}

@ApiTags("Health")
@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly prisma: PrismaHealthIndicator,
		private readonly prismaService: PrismaService,
	) {}

	@Get()
	@HealthCheck()
	@ApiOperation({ summary: "Health check" })
	check() {
		return this.health.check([() => this.prisma.pingCheck("database", this.prismaService)]);
	}

	@Get("live")
	@ApiOperation({ summary: "Liveness check for process-level uptime" })
	live() {
		return {
			status: "ok",
			uptimeSeconds: Math.round(process.uptime()),
			timestamp: new Date().toISOString(),
		};
	}

	@Get("ready")
	@ApiOperation({ summary: "Readiness check for required runtime dependencies" })
	async ready(@Res({ passthrough: true }) res: Response) {
		const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
		const status = [database, redis].some((dependency) => dependency.status === "down") ? "error" : "ok";
		if (status !== "ok") res.status(HttpStatus.SERVICE_UNAVAILABLE);
		return {
			status,
			timestamp: new Date().toISOString(),
			dependencies: {
				database,
				redis,
			},
		};
	}

	private async checkDatabase(): Promise<DependencyCheck> {
		const started = Date.now();
		try {
			await this.prismaService.$queryRaw`SELECT 1`;
			return { status: "up", latencyMs: Date.now() - started };
		} catch (error) {
			return {
				status: "down",
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async checkRedis(): Promise<DependencyCheck> {
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
}

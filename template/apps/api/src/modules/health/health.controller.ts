import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PrismaService } from "#shared/database/prisma.service";
import { HealthDiagnosticsService } from "./health-diagnostics.service";

@ApiTags("Health")
@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly prisma: PrismaHealthIndicator,
		private readonly prismaService: PrismaService,
		private readonly diagnostics: HealthDiagnosticsService,
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
		const result = await this.diagnostics.readiness();
		if (result.status !== "ok") res.status(HttpStatus.SERVICE_UNAVAILABLE);
		return result;
	}
}

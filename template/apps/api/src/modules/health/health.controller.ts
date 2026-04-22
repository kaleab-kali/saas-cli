import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { PrismaService } from "#shared/database/prisma.service";

@ApiTags("Health")
@Controller("health")
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
}

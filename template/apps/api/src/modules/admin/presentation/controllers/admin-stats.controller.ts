import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { GetPlatformStatsHandler } from "#modules/admin/application/queries/get-platform-stats.handler";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/stats")
@UseGuards(SuperAdminGuard)
export class AdminStatsController {
	constructor(private readonly getStats: GetPlatformStatsHandler) {}

	@Get()
	@ApiOperation({ summary: "Get platform-wide statistics" })
	async getStatistics() {
		const stats = await this.getStats.execute();
		return { data: stats };
	}
}

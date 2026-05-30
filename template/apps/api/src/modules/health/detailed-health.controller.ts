import { Controller, Get, HttpStatus, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { HealthDiagnosticsService } from "./health-diagnostics.service";

@ApiTags("Health")
@AllowAnonymous()
@Controller("health")
@UseGuards(SuperAdminGuard)
@SkipThrottle()
export class DetailedHealthController {
	constructor(private readonly diagnostics: HealthDiagnosticsService) {}

	@Get("detailed")
	@ApiOperation({ summary: "Admin-only detailed system health check" })
	async detailed(@Res({ passthrough: true }) res: Response) {
		const result = await this.diagnostics.detailed();
		if (result.status === "error") res.status(HttpStatus.SERVICE_UNAVAILABLE);
		return { data: result };
	}
}

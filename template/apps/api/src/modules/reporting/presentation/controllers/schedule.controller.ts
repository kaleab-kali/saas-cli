import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CancelScheduleHandler } from "../../application/commands/cancel-schedule/cancel-schedule.handler";
import { ScheduleReportHandler } from "../../application/commands/schedule-report/schedule-report.handler";
import { CreateScheduleDto } from "../../application/dto/schedule.dto";
import { ListSchedulesHandler } from "../../application/queries/list-schedules.handler";

@ApiTags("Reporting — Schedules")
@Controller("reporting/schedules")
@UseGuards(AuthGuard, PermissionsGuard)
export class ScheduleController {
	constructor(
		private readonly listH: ListSchedulesHandler,
		private readonly scheduleH: ScheduleReportHandler,
		private readonly cancelH: CancelScheduleHandler,
	) {}

	@Get()
	@RequirePermissions("report:view-dashboard")
	async list(
		@Query("reportId") reportId: string | undefined,
		@Query("enabled") enabled: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const data = await this.listH.execute(req.organizationId, {
			reportId,
			enabled: enabled === "true" ? true : enabled === "false" ? false : undefined,
		});
		return { data };
	}

	@Post()
	@RequirePermissions("report:create-custom")
	async create(@Body() dto: CreateScheduleDto, @Req() req: { organizationId: string }) {
		const data = await this.scheduleH.execute(req.organizationId, dto);
		return { data };
	}

	@Delete(":id")
	@RequirePermissions("report:create-custom")
	async cancel(@Param("id") id: string, @Req() req: { organizationId: string }) {
		await this.cancelH.execute(req.organizationId, id);
		return { data: { deleted: true } };
	}
}

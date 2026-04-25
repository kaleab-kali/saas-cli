import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateReportHandler } from "../../application/commands/create-report/create-report.handler";
import { DeleteReportHandler } from "../../application/commands/delete-report/delete-report.handler";
import { ExecuteReportHandler } from "../../application/commands/execute-report/execute-report.handler";
import { UpdateReportHandler } from "../../application/commands/update-report/update-report.handler";
import { CreateSavedReportDto, UpdateSavedReportDto } from "../../application/dto/saved-report.dto";
import { ExecuteReportDto } from "../../application/dto/schedule.dto";
import { AllowedFieldsHandler } from "../../application/queries/allowed-fields.handler";
import { GetReportHandler } from "../../application/queries/get-report.handler";
import { ListReportsHandler } from "../../application/queries/list-reports.handler";
import type { ExportFormat } from "../../domain/value-objects/report.vo";

@ApiTags("Reporting — Reports")
@Controller("reporting/reports")
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportController {
	constructor(
		private readonly listH: ListReportsHandler,
		private readonly getH: GetReportHandler,
		private readonly createH: CreateReportHandler,
		private readonly updateH: UpdateReportHandler,
		private readonly deleteH: DeleteReportHandler,
		private readonly executeH: ExecuteReportHandler,
		private readonly allowedH: AllowedFieldsHandler,
	) {}

	@Get()
	@RequirePermissions("report:view-dashboard")
	async list(
		@Query("dataSource") dataSource: string | undefined,
		@Query("isTemplate") isTemplate: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const data = await this.listH.execute(req.organizationId, {
			dataSource,
			isTemplate: isTemplate === "true" ? true : isTemplate === "false" ? false : undefined,
		});
		return { data };
	}

	@Get("allowed-fields/:dataSource")
	@RequirePermissions("report:view-dashboard")
	allowed(@Param("dataSource") dataSource: string) {
		return { data: this.allowedH.execute(dataSource) };
	}

	@Get(":id")
	@RequirePermissions("report:view-dashboard")
	async get(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.getH.execute(req.organizationId, id);
		return { data };
	}

	@Post()
	@RequirePermissions("report:create-custom")
	@ApiOperation({ summary: "Create saved report" })
	async create(@Body() dto: CreateSavedReportDto, @Req() req: { organizationId: string; userId?: string }) {
		const data = await this.createH.execute(req.organizationId, dto, req.userId ?? null);
		return { data };
	}

	@Patch(":id")
	@RequirePermissions("report:create-custom")
	async update(@Param("id") id: string, @Body() dto: UpdateSavedReportDto, @Req() req: { organizationId: string }) {
		const data = await this.updateH.execute(req.organizationId, id, dto);
		return { data };
	}

	@Delete(":id")
	@RequirePermissions("report:create-custom")
	async remove(@Param("id") id: string, @Req() req: { organizationId: string }) {
		await this.deleteH.execute(req.organizationId, id);
		return { data: { deleted: true } };
	}

	@Post(":id/execute")
	@RequirePermissions("report:view-dashboard")
	@ApiOperation({ summary: "Execute and return rows (optionally as CSV/XLSX/PDF)" })
	async execute(
		@Param("id") id: string,
		@Body() dto: ExecuteReportDto,
		@Req() req: { organizationId: string; userId?: string },
		@Res() res: Response,
	) {
		const result = await this.executeH.execute(
			req.organizationId,
			id,
			(dto.format as ExportFormat) ?? null,
			req.userId ?? null,
		);
		if (result.file && result.mimeType && result.filename) {
			res.setHeader("Content-Type", result.mimeType);
			res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
			res.send(result.file);
			return;
		}
		res.json({ data: { headers: result.headers, rows: result.rows } });
	}
}

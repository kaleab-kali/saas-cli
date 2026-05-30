import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { DashboardService } from "../../application/services/dashboard.service";
import { DashboardExportService } from "../../application/services/dashboard-export.service";
import { EXPORT_FORMATS, type ExportFormat } from "../../domain/value-objects/report.vo";

const VALID_KINDS = ["main"] as const;
type DashboardKind = (typeof VALID_KINDS)[number];

@ApiTags("Reporting - Dashboards")
@Controller("reporting/dashboards")
@UseGuards(AuthGuard, PermissionsGuard)
export class DashboardController {
	constructor(
		private readonly svc: DashboardService,
		private readonly exporter: DashboardExportService,
	) {}

	@Get("main")
	@RequirePermissions("report:read")
	async main(@Req() req: { organizationId: string }) {
		const data = await this.svc.main(req.organizationId);
		return { data };
	}

	@Get(":kind/export")
	@RequirePermissions("report:read")
	async export(
		@Param("kind") kind: string,
		@Query("format") format: string,
		@Req() req: { organizationId: string },
		@Res() res: Response,
	) {
		if (!VALID_KINDS.includes(kind as DashboardKind)) throw new BadRequestException("Invalid dashboard kind");
		if (!EXPORT_FORMATS.includes(format as ExportFormat)) throw new BadRequestException("Invalid format");
		const result = await this.exporter.export(kind as DashboardKind, format as ExportFormat, req.organizationId);
		res.setHeader("Content-Type", result.mime);
		res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
		res.send(result.buffer);
	}
}

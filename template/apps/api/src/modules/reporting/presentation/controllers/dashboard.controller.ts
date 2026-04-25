import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { DashboardService } from "../../application/services/dashboard.service";
import { DashboardExportService } from "../../application/services/dashboard-export.service";
import { EXPORT_FORMATS, type ExportFormat } from "../../domain/value-objects/report.vo";

const VALID_KINDS = ["main", "property", "financial", "crm", "maintenance"] as const;
type DashboardKind = (typeof VALID_KINDS)[number];

@ApiTags("Reporting — Dashboards")
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

	@Get("property")
	@RequirePermissions("report:read")
	async property(@Query("buildingId") buildingId: string | undefined, @Req() req: { organizationId: string }) {
		const data = await this.svc.property(req.organizationId, buildingId);
		return { data };
	}

	@Get("financial")
	@RequirePermissions("report:read")
	async financial(
		@Query("from") from: string | undefined,
		@Query("to") to: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const now = new Date();
		const f = from ? new Date(from) : new Date(now.getFullYear(), 0, 1);
		const t = to ? new Date(to) : now;
		const data = await this.svc.financial(req.organizationId, f, t);
		return { data };
	}

	@Get("crm")
	@RequirePermissions("report:read")
	async crm(@Req() req: { organizationId: string }) {
		const data = await this.svc.crm(req.organizationId);
		return { data };
	}

	@Get("maintenance")
	@RequirePermissions("report:read")
	async maintenance(
		@Query("from") from: string | undefined,
		@Query("to") to: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const now = new Date();
		const f = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
		const t = to ? new Date(to) : now;
		const data = await this.svc.maintenance(req.organizationId, f, t);
		return { data };
	}

	@Get(":kind/export")
	@RequirePermissions("report:read")
	async export(
		@Param("kind") kind: string,
		@Query("format") format: string,
		@Query("buildingId") buildingId: string | undefined,
		@Query("from") from: string | undefined,
		@Query("to") to: string | undefined,
		@Req() req: { organizationId: string },
		@Res() res: Response,
	) {
		if (!VALID_KINDS.includes(kind as DashboardKind)) throw new BadRequestException("Invalid dashboard kind");
		if (!EXPORT_FORMATS.includes(format as ExportFormat)) throw new BadRequestException("Invalid format");
		const result = await this.exporter.export(kind as DashboardKind, format as ExportFormat, req.organizationId, {
			buildingId,
			from: from ? new Date(from) : undefined,
			to: to ? new Date(to) : undefined,
		});
		res.setHeader("Content-Type", result.mime);
		res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
		res.send(result.buffer);
	}
}

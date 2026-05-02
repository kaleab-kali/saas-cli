import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { ListAuditLogsHandler } from "../../application/queries/list-audit-logs.handler";
import { AuditExporterService } from "../../application/services/audit-exporter.service";

const parseDate = (v?: string) => (v ? new Date(v) : undefined);
const parseInt10 = (v?: string) => (v ? Number.parseInt(v, 10) : undefined);

@ApiTags("Audit Log")
@Controller("audit-logs")
@UseGuards(AuthGuard, PermissionsGuard)
export class AuditLogController {
	constructor(
		private readonly list: ListAuditLogsHandler,
		private readonly exporter: AuditExporterService,
	) {}

	@Get()
	@RequirePermissions("audit-log:read")
	@ApiOperation({ summary: "List audit log entries (filterable)" })
	async listLogs(
		@Query("action") action: string | undefined,
		@Query("resource") resource: string | undefined,
		@Query("userId") userId: string | undefined,
		@Query("status") status: string | undefined,
		@Query("from") from: string | undefined,
		@Query("to") to: string | undefined,
		@Query("skip") skip: string | undefined,
		@Query("take") take: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const { data, total } = await this.list.execute(req.organizationId, {
			action,
			resource,
			userId,
			status,
			from: parseDate(from),
			to: parseDate(to),
			skip: parseInt10(skip),
			take: parseInt10(take),
		});
		return { data, meta: { total } };
	}

	@Get("export/:format")
	@RequirePermissions("audit-log:export")
	@ApiOperation({ summary: "Export audit logs (csv|json)" })
	async exportLogs(
		@Param("format") format: string,
		@Query("action") action: string | undefined,
		@Query("resource") resource: string | undefined,
		@Query("userId") userId: string | undefined,
		@Query("status") status: string | undefined,
		@Query("from") from: string | undefined,
		@Query("to") to: string | undefined,
		@Req() req: { organizationId: string },
		@Res() res: Response,
	) {
		const q = { action, resource, userId, status, from: parseDate(from), to: parseDate(to) };
		const stamp = new Date().toISOString().slice(0, 10);
		if (format === "csv") {
			const buf = await this.exporter.exportCsv(req.organizationId, q);
			res.setHeader("Content-Type", "text/csv");
			res.setHeader("Content-Disposition", `attachment; filename="audit-log-${stamp}.csv"`);
			res.send(buf);
			return;
		}
		if (format === "json") {
			const buf = await this.exporter.exportJson(req.organizationId, q);
			res.setHeader("Content-Type", "application/json");
			res.setHeader("Content-Disposition", `attachment; filename="audit-log-${stamp}.json"`);
			res.send(buf);
			return;
		}
		throw new BadRequestException("format must be csv|json");
	}
}

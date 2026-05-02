import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";

import { ListPlatformAuditLogsHandler } from "#modules/admin/application/queries/list-platform-audit-logs.handler";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";

const toCsv = (rows: Array<Record<string, unknown>>): string => {
	const headers = ["id", "action", "performedBy", "targetType", "targetId", "details", "ipAddress", "createdAt"];
	const esc = (v: unknown) => {
		if (v == null) return "";
		const s = typeof v === "string" ? v : JSON.stringify(v);
		return `"${s.replace(/"/g, '""')}"`;
	};
	const lines = [headers.join(",")];
	for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
	return lines.join("\n");
};

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/audit-logs")
@UseGuards(SuperAdminGuard)
export class AdminAuditController {
	constructor(private readonly listLogs: ListPlatformAuditLogsHandler) {}

	@Get()
	@ApiOperation({ summary: "List platform audit logs" })
	async list(
		@Query("page") page?: number,
		@Query("limit") limit?: number,
		@Query("action") action?: string,
		@Query("targetType") targetType?: string,
	) {
		return this.listLogs.execute({ page, limit, action, targetType });
	}

	@Get("export")
	@ApiOperation({ summary: "Export audit logs as CSV" })
	async exportCsv(@Res() res: Response, @Query("action") action?: string, @Query("targetType") targetType?: string) {
		const result = await this.listLogs.execute({ page: 1, limit: 5000, action, targetType });
		const csv = toCsv(result.data as unknown as Array<Record<string, unknown>>);
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		res.setHeader("content-type", "text/csv; charset=utf-8");
		res.setHeader("content-disposition", `attachment; filename="platform-audit-${stamp}.csv"`);
		res.send(csv);
	}
}

import { Injectable } from "@nestjs/common";
import { type AuditLogQuery, AuditLogRepository } from "../../domain/repositories/audit-log.repository";

@Injectable()
export class AuditExporterService {
	constructor(private readonly repo: AuditLogRepository) {}

	async exportCsv(organizationId: string, q: AuditLogQuery): Promise<Buffer> {
		const { rows } = await this.repo.list(organizationId, { ...q, take: 10000, skip: 0 });
		const headers = ["createdAt", "action", "resource", "resourceId", "userId", "userEmail", "status", "ipAddress"];
		const esc = (v: unknown) => {
			if (v == null) return "";
			const s = String(v);
			return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
		};
		const lines = [headers.join(",")];
		for (const r of rows) {
			const p = r.toPrimitives();
			lines.push(
				[p.createdAt.toISOString(), p.action, p.resource, p.resourceId, p.userId, p.userEmail, p.status, p.ipAddress]
					.map(esc)
					.join(","),
			);
		}
		return Buffer.from(`\uFEFF${lines.join("\n")}`, "utf-8");
	}

	async exportJson(organizationId: string, q: AuditLogQuery): Promise<Buffer> {
		const { rows } = await this.repo.list(organizationId, { ...q, take: 10000, skip: 0 });
		return Buffer.from(
			JSON.stringify(
				rows.map((r) => r.toPrimitives()),
				null,
				2,
			),
			"utf-8",
		);
	}
}

import { Injectable } from "@nestjs/common";
import { type AuditLogQuery, AuditLogRepository } from "../../domain/repositories/audit-log.repository";

@Injectable()
export class ListAuditLogsHandler {
	constructor(private readonly repo: AuditLogRepository) {}

	async execute(organizationId: string, q: AuditLogQuery) {
		const { rows, total } = await this.repo.list(organizationId, q);
		return {
			data: rows.map((r) => r.toPrimitives()),
			total,
		};
	}
}

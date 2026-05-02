import { Injectable } from "@nestjs/common";
import { ReportExecutionRepository } from "../../domain/repositories/report-execution.repository";

@Injectable()
export class ListExecutionsHandler {
	constructor(private readonly repo: ReportExecutionRepository) {}

	async execute(organizationId: string, q: { reportId?: string; limit?: number } = {}) {
		const rows = await this.repo.list(organizationId, q);
		return rows.map((r) => r.toPrimitives());
	}
}

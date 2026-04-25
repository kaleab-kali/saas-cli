import { Injectable } from "@nestjs/common";
import { SavedReportRepository } from "../../domain/repositories/saved-report.repository";

@Injectable()
export class ListReportsHandler {
	constructor(private readonly repo: SavedReportRepository) {}

	async execute(organizationId: string, q: { dataSource?: string; isTemplate?: boolean } = {}) {
		const rows = await this.repo.list(organizationId, q);
		return rows.map((r) => r.toPrimitives());
	}
}

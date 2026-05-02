import { Injectable, NotFoundException } from "@nestjs/common";
import { SavedReportRepository } from "../../domain/repositories/saved-report.repository";

@Injectable()
export class GetReportHandler {
	constructor(private readonly repo: SavedReportRepository) {}

	async execute(organizationId: string, id: string) {
		const r = await this.repo.findById(organizationId, id);
		if (!r) throw new NotFoundException("Report not found");
		return r.toPrimitives();
	}
}

import { Injectable } from "@nestjs/common";
import { ReportScheduleRepository } from "../../domain/repositories/report-schedule.repository";

@Injectable()
export class ListSchedulesHandler {
	constructor(private readonly repo: ReportScheduleRepository) {}

	async execute(organizationId: string, q: { reportId?: string; enabled?: boolean } = {}) {
		const rows = await this.repo.list(organizationId, q);
		return rows.map((r) => r.toPrimitives());
	}
}

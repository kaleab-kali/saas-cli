import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { SavedReportRepository } from "../../../domain/repositories/saved-report.repository";

@Injectable()
export class DeleteReportHandler {
	constructor(
		private readonly repo: SavedReportRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const report = await this.repo.findById(organizationId, id);
		if (!report) throw new NotFoundException("Report not found");
		await this.repo.delete(organizationId, id);
		this.events.emit({
			eventName: REPORTING_EVENTS.REPORT_DELETED,
			organizationId,
			payload: { reportId: id },
		});
	}
}

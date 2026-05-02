import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { SavedReportRepository } from "../../../domain/repositories/saved-report.repository";
import { ReportSpecService } from "../../../domain/services/report-spec.service";
import type { UpdateSavedReportDto } from "../../dto/saved-report.dto";

@Injectable()
export class UpdateReportHandler {
	constructor(
		private readonly repo: SavedReportRepository,
		private readonly spec: ReportSpecService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string, dto: UpdateSavedReportDto) {
		const report = await this.repo.findById(organizationId, id);
		if (!report) throw new NotFoundException("Report not found");
		report.update(dto as never);
		this.spec.assertValid(report);
		const saved = await this.repo.update(organizationId, id, report);
		this.events.emit({
			eventName: REPORTING_EVENTS.REPORT_UPDATED,
			organizationId,
			payload: { reportId: id },
		});
		return saved.toPrimitives();
	}
}

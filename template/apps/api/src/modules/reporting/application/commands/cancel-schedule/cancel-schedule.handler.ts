import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { ReportScheduleRepository } from "../../../domain/repositories/report-schedule.repository";

@Injectable()
export class CancelScheduleHandler {
	constructor(
		private readonly repo: ReportScheduleRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const s = await this.repo.findById(organizationId, id);
		if (!s) throw new NotFoundException("Schedule not found");
		await this.repo.delete(organizationId, id);
		this.events.emit({
			eventName: REPORTING_EVENTS.SCHEDULE_CANCELLED,
			organizationId,
			payload: { scheduleId: id },
		});
	}
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { createId } from "#shared/lib/id";
import { ReportSchedule } from "../../../domain/entities/report-schedule.entity";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { ReportScheduleRepository } from "../../../domain/repositories/report-schedule.repository";
import { SavedReportRepository } from "../../../domain/repositories/saved-report.repository";
import type { ExportFormat, ScheduleFrequency } from "../../../domain/value-objects/report.vo";
import type { CreateScheduleDto } from "../../dto/schedule.dto";

@Injectable()
export class ScheduleReportHandler {
	constructor(
		private readonly schedules: ReportScheduleRepository,
		private readonly reports: SavedReportRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: CreateScheduleDto) {
		const report = await this.reports.findById(organizationId, dto.reportId);
		if (!report) throw new NotFoundException("Report not found");
		const now = new Date();
		const schedule = ReportSchedule.create({
			id: createId(),
			organizationId,
			reportId: dto.reportId,
			frequency: dto.frequency as ScheduleFrequency,
			dayOfWeek: dto.dayOfWeek ?? null,
			dayOfMonth: dto.dayOfMonth ?? null,
			timeOfDay: dto.timeOfDay,
			recipients: dto.recipients,
			format: dto.format as ExportFormat,
			enabled: dto.enabled ?? true,
			lastRunAt: null,
			nextRunAt: null,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.schedules.save(schedule);
		this.events.emit({
			eventName: REPORTING_EVENTS.SCHEDULE_CREATED,
			organizationId,
			payload: { scheduleId: saved.id, reportId: dto.reportId },
		});
		return saved.toPrimitives();
	}
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailDispatcherService } from "#modules/notification/application/services/email-dispatcher.service";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { REPORTING_EVENTS } from "../../domain/events/reporting.events";
import { ReportScheduleRepository } from "../../domain/repositories/report-schedule.repository";
import { ExecuteReportHandler } from "../commands/execute-report/execute-report.handler";

@Injectable()
export class ScheduledDeliveryService {
	private readonly logger = new Logger(ScheduledDeliveryService.name);

	constructor(
		private readonly schedules: ReportScheduleRepository,
		private readonly executeH: ExecuteReportHandler,
		private readonly dispatcher: EmailDispatcherService,
		private readonly events: DomainEventBus,
	) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async tick() {
		const due = await this.schedules.listDueToRun();
		for (const s of due) {
			const p = s.toPrimitives();
			try {
				const result = await this.executeH.execute(p.organizationId, p.reportId, p.format, null, "scheduled");
				if (result.file && result.filename) {
					for (const email of p.recipients) {
						await this.dispatcher.dispatch({
							organizationId: p.organizationId,
							to: email,
							subject: `Scheduled report: ${result.filename}`,
							html: `<p>Your ${p.frequency} report is attached.</p>`,
							text: `Your ${p.frequency} report is attached.`,
							source: "bulk",
							sourceRef: p.reportId,
						});
					}
				}
				s.markRun();
				await this.schedules.update(p.organizationId, p.id, s);
				this.events.emit({
					eventName: REPORTING_EVENTS.SCHEDULE_DELIVERED,
					organizationId: p.organizationId,
					payload: { scheduleId: p.id, recipients: p.recipients, rowCount: result.rows.length },
				});
			} catch (e) {
				this.logger.error(`Scheduled report ${p.id} failed: ${(e as Error).message}`);
			}
		}
	}
}

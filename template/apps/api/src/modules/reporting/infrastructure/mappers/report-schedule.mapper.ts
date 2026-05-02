import { ReportSchedule, type ReportScheduleProps } from "../../domain/entities/report-schedule.entity";
import type { ExportFormat, ScheduleFrequency } from "../../domain/value-objects/report.vo";

export interface ScheduleRow {
	id: string;
	organizationId: string;
	reportId: string;
	frequency: string;
	dayOfWeek: number | null;
	dayOfMonth: number | null;
	timeOfDay: string;
	recipients: string[];
	format: string;
	enabled: boolean;
	lastRunAt: Date | null;
	nextRunAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export const ReportScheduleMapper = {
	toDomain(row: ScheduleRow): ReportSchedule {
		const props: ReportScheduleProps = {
			...row,
			frequency: row.frequency as ScheduleFrequency,
			format: row.format as ExportFormat,
		};
		return ReportSchedule.rehydrate(props);
	},

	toPersistence(s: ReportSchedule) {
		return { ...s.toPrimitives() };
	},

	toDto(s: ReportSchedule) {
		return s.toPrimitives();
	},
};

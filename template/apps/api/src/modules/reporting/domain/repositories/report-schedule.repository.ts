import type { ReportSchedule } from "../entities/report-schedule.entity";

export abstract class ReportScheduleRepository {
	abstract findById(organizationId: string, id: string): Promise<ReportSchedule | null>;
	abstract list(organizationId: string, q?: { reportId?: string; enabled?: boolean }): Promise<ReportSchedule[]>;
	abstract listDueToRun(): Promise<ReportSchedule[]>;
	abstract save(s: ReportSchedule): Promise<ReportSchedule>;
	abstract update(organizationId: string, id: string, s: ReportSchedule): Promise<ReportSchedule>;
	abstract delete(organizationId: string, id: string): Promise<void>;
}

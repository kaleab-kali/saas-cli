import type { ReportExecution } from "../entities/report-execution.entity";

export abstract class ReportExecutionRepository {
	abstract list(organizationId: string, q?: { reportId?: string; limit?: number }): Promise<ReportExecution[]>;
	abstract findById(organizationId: string, id: string): Promise<ReportExecution | null>;
	abstract save(e: ReportExecution): Promise<ReportExecution>;
	abstract update(organizationId: string, id: string, e: ReportExecution): Promise<ReportExecution>;
}

import { ReportExecution, type ReportExecutionProps } from "../../domain/entities/report-execution.entity";
import type { ExecutionStatus } from "../../domain/value-objects/report.vo";

export interface ExecutionRow {
	id: string;
	organizationId: string;
	reportId: string;
	triggeredBy: string;
	triggeredUserId: string | null;
	status: string;
	rowCount: number;
	durationMs: number | null;
	error: string | null;
	format: string | null;
	emailedTo: string[];
	createdAt: Date;
	completedAt: Date | null;
}

export const ReportExecutionMapper = {
	toDomain(row: ExecutionRow): ReportExecution {
		const props: ReportExecutionProps = { ...row, status: row.status as ExecutionStatus };
		return ReportExecution.rehydrate(props);
	},

	toPersistence(e: ReportExecution) {
		return { ...e.toPrimitives() };
	},

	toDto(e: ReportExecution) {
		return e.toPrimitives();
	},
};

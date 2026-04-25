import { BadRequestException } from "@nestjs/common";
import { type ExecutionStatus } from "../value-objects/report.vo";

export interface ReportExecutionProps {
	id: string;
	organizationId: string;
	reportId: string;
	triggeredBy: string; // manual | scheduled
	triggeredUserId: string | null;
	status: ExecutionStatus;
	rowCount: number;
	durationMs: number | null;
	error: string | null;
	format: string | null;
	emailedTo: string[];
	createdAt: Date;
	completedAt: Date | null;
}

export class ReportExecution {
	private constructor(private props: ReportExecutionProps) {}

	static create(props: ReportExecutionProps): ReportExecution {
		return new ReportExecution(props);
	}

	static rehydrate(props: ReportExecutionProps): ReportExecution {
		return new ReportExecution(props);
	}

	get id() {
		return this.props.id;
	}

	start() {
		if (this.props.status !== "pending") throw new BadRequestException("execution already started");
		this.props.status = "running";
	}

	complete(rowCount: number, durationMs: number, emailedTo: string[] = []) {
		this.props.status = "completed";
		this.props.rowCount = rowCount;
		this.props.durationMs = durationMs;
		this.props.emailedTo = emailedTo;
		this.props.completedAt = new Date();
	}

	fail(error: string, durationMs: number) {
		this.props.status = "failed";
		this.props.error = error;
		this.props.durationMs = durationMs;
		this.props.completedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

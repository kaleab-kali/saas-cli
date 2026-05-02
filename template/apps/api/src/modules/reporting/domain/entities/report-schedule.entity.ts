import { BadRequestException } from "@nestjs/common";
import { type ExportFormat, isFormat, isFrequency, type ScheduleFrequency } from "../value-objects/report.vo";

export interface ReportScheduleProps {
	id: string;
	organizationId: string;
	reportId: string;
	frequency: ScheduleFrequency;
	dayOfWeek: number | null;
	dayOfMonth: number | null;
	timeOfDay: string;
	recipients: string[];
	format: ExportFormat;
	enabled: boolean;
	lastRunAt: Date | null;
	nextRunAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class ReportSchedule {
	private constructor(private props: ReportScheduleProps) {}

	static create(props: ReportScheduleProps): ReportSchedule {
		if (!isFrequency(props.frequency)) throw new BadRequestException(`invalid frequency: ${props.frequency}`);
		if (!isFormat(props.format)) throw new BadRequestException(`invalid format: ${props.format}`);
		if (!props.recipients?.length) throw new BadRequestException("at least one recipient required");
		if (!/^\d{2}:\d{2}$/.test(props.timeOfDay)) throw new BadRequestException("timeOfDay must be HH:MM");
		if (props.frequency === "weekly" && (props.dayOfWeek == null || props.dayOfWeek < 0 || props.dayOfWeek > 6)) {
			throw new BadRequestException("dayOfWeek 0-6 required for weekly");
		}
		if (props.frequency === "monthly" && (props.dayOfMonth == null || props.dayOfMonth < 1 || props.dayOfMonth > 31)) {
			throw new BadRequestException("dayOfMonth 1-31 required for monthly");
		}
		const s = new ReportSchedule(props);
		s.computeNextRun();
		return s;
	}

	static rehydrate(props: ReportScheduleProps): ReportSchedule {
		return new ReportSchedule(props);
	}

	get id() {
		return this.props.id;
	}
	get nextRunAt() {
		return this.props.nextRunAt;
	}
	get enabled() {
		return this.props.enabled;
	}

	computeNextRun() {
		const [hh, mm] = this.props.timeOfDay.split(":").map(Number);
		const now = new Date();
		const next = new Date(now);
		next.setHours(hh, mm, 0, 0);
		if (this.props.frequency === "daily") {
			if (next <= now) next.setDate(next.getDate() + 1);
		} else if (this.props.frequency === "weekly" && this.props.dayOfWeek != null) {
			const dow = this.props.dayOfWeek;
			const delta = (dow - next.getDay() + 7) % 7;
			next.setDate(next.getDate() + delta);
			if (next <= now) next.setDate(next.getDate() + 7);
		} else if (this.props.frequency === "monthly" && this.props.dayOfMonth != null) {
			next.setDate(this.props.dayOfMonth);
			if (next <= now) next.setMonth(next.getMonth() + 1);
		}
		this.props.nextRunAt = next;
	}

	markRun() {
		this.props.lastRunAt = new Date();
		this.computeNextRun();
		this.props.updatedAt = new Date();
	}

	disable() {
		this.props.enabled = false;
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

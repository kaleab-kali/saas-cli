import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { ReportSchedule } from "../../domain/entities/report-schedule.entity";
import { ReportScheduleRepository } from "../../domain/repositories/report-schedule.repository";
import { ReportScheduleMapper } from "../mappers/report-schedule.mapper";

@Injectable()
export class PrismaReportScheduleRepository extends ReportScheduleRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
		return row ? ReportScheduleMapper.toDomain(row) : null;
	}

	async list(organizationId: string, q: { reportId?: string; enabled?: boolean } = {}) {
		const rows = await this.prisma.reportSchedule.findMany({
			where: {
				organizationId,
				...(q.reportId ? { reportId: q.reportId } : {}),
				...(q.enabled !== undefined ? { enabled: q.enabled } : {}),
			},
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => ReportScheduleMapper.toDomain(r));
	}

	async listDueToRun() {
		const now = new Date();
		const rows = await this.prisma.reportSchedule.findMany({
			where: { enabled: true, nextRunAt: { lte: now } },
		});
		return rows.map((r) => ReportScheduleMapper.toDomain(r));
	}

	async save(s: ReportSchedule) {
		const row = await this.prisma.reportSchedule.create({ data: ReportScheduleMapper.toPersistence(s) });
		return ReportScheduleMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, s: ReportSchedule) {
		const p = ReportScheduleMapper.toPersistence(s);
		const row = await this.prisma.reportSchedule.update({
			where: { id },
			data: {
				frequency: p.frequency,
				dayOfWeek: p.dayOfWeek,
				dayOfMonth: p.dayOfMonth,
				timeOfDay: p.timeOfDay,
				recipients: p.recipients,
				format: p.format,
				enabled: p.enabled,
				lastRunAt: p.lastRunAt,
				nextRunAt: p.nextRunAt,
				updatedAt: p.updatedAt,
			},
		});
		return ReportScheduleMapper.toDomain(row);
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.prisma.reportSchedule.deleteMany({ where: { id, organizationId } });
	}
}

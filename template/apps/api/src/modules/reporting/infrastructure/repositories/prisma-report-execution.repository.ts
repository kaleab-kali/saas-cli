import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { ReportExecution } from "../../domain/entities/report-execution.entity";
import { ReportExecutionRepository } from "../../domain/repositories/report-execution.repository";
import { ReportExecutionMapper } from "../mappers/report-execution.mapper";

@Injectable()
export class PrismaReportExecutionRepository extends ReportExecutionRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async list(organizationId: string, q: { reportId?: string; limit?: number } = {}) {
		const rows = await this.prisma.reportExecution.findMany({
			where: { organizationId, ...(q.reportId ? { reportId: q.reportId } : {}) },
			orderBy: { createdAt: "desc" },
			take: Math.min(200, q.limit ?? 50),
		});
		return rows.map((r) => ReportExecutionMapper.toDomain(r));
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.reportExecution.findFirst({ where: { id, organizationId } });
		return row ? ReportExecutionMapper.toDomain(row) : null;
	}

	async save(e: ReportExecution) {
		const row = await this.prisma.reportExecution.create({ data: ReportExecutionMapper.toPersistence(e) });
		return ReportExecutionMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, e: ReportExecution) {
		const p = ReportExecutionMapper.toPersistence(e);
		const row = await this.prisma.reportExecution.update({
			where: { id },
			data: {
				status: p.status,
				rowCount: p.rowCount,
				durationMs: p.durationMs,
				error: p.error,
				format: p.format,
				emailedTo: p.emailedTo,
				completedAt: p.completedAt,
			},
		});
		return ReportExecutionMapper.toDomain(row);
	}
}

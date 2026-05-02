import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { SavedReport } from "../../domain/entities/saved-report.entity";
import { SavedReportRepository } from "../../domain/repositories/saved-report.repository";
import { SavedReportMapper } from "../mappers/saved-report.mapper";

@Injectable()
export class PrismaSavedReportRepository extends SavedReportRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.savedReport.findFirst({ where: { id, organizationId } });
		return row ? SavedReportMapper.toDomain(row) : null;
	}

	async list(organizationId: string, q: { dataSource?: string; isTemplate?: boolean } = {}) {
		const rows = await this.prisma.savedReport.findMany({
			where: {
				organizationId,
				...(q.dataSource ? { dataSource: q.dataSource } : {}),
				...(q.isTemplate !== undefined ? { isTemplate: q.isTemplate } : {}),
			},
			orderBy: { updatedAt: "desc" },
		});
		return rows.map((r) => SavedReportMapper.toDomain(r));
	}

	async save(report: SavedReport) {
		const row = await this.prisma.savedReport.create({ data: SavedReportMapper.toPersistence(report) });
		return SavedReportMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, report: SavedReport) {
		const p = SavedReportMapper.toPersistence(report);
		const row = await this.prisma.savedReport.update({
			where: { id },
			data: {
				name: p.name,
				description: p.description,
				columnsJson: p.columnsJson,
				filtersJson: p.filtersJson,
				groupByJson: p.groupByJson,
				sortJson: p.sortJson,
				chartType: p.chartType,
				isTemplate: p.isTemplate,
				sharedWithTeam: p.sharedWithTeam,
				updatedAt: p.updatedAt,
			},
		});
		return SavedReportMapper.toDomain(row);
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.prisma.savedReport.deleteMany({ where: { id, organizationId } });
	}
}

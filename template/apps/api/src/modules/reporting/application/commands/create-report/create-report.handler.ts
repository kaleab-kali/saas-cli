import { Injectable } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { createId } from "#shared/lib/id";
import { SavedReport } from "../../../domain/entities/saved-report.entity";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { SavedReportRepository } from "../../../domain/repositories/saved-report.repository";
import { ReportSpecService } from "../../../domain/services/report-spec.service";
import type {
	ChartType,
	DataSource,
	ReportColumn,
	ReportFilter,
	ReportSort,
} from "../../../domain/value-objects/report.vo";
import type { CreateSavedReportDto } from "../../dto/saved-report.dto";

@Injectable()
export class CreateReportHandler {
	constructor(
		private readonly repo: SavedReportRepository,
		private readonly spec: ReportSpecService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: CreateSavedReportDto, userId: string | null) {
		const now = new Date();
		const report = SavedReport.create({
			id: createId(),
			organizationId,
			name: dto.name,
			description: dto.description ?? null,
			dataSource: dto.dataSource as DataSource,
			columns: dto.columns as ReportColumn[],
			filters: (dto.filters as ReportFilter[]) ?? [],
			groupBy: dto.groupBy ?? [],
			sort: (dto.sort as ReportSort[]) ?? [],
			chartType: (dto.chartType as ChartType) ?? null,
			isTemplate: dto.isTemplate ?? false,
			sharedWithTeam: dto.sharedWithTeam ?? false,
			createdBy: userId,
			createdAt: now,
			updatedAt: now,
		});
		this.spec.assertValid(report);
		const saved = await this.repo.save(report);
		this.events.emit({
			eventName: REPORTING_EVENTS.REPORT_CREATED,
			organizationId,
			payload: { reportId: saved.id },
		});
		return saved.toPrimitives();
	}
}

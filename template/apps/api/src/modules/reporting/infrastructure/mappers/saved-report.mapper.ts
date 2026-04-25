import { SavedReport, type SavedReportProps } from "../../domain/entities/saved-report.entity";
import type {
	ChartType,
	DataSource,
	ReportColumn,
	ReportFilter,
	ReportSort,
} from "../../domain/value-objects/report.vo";

export interface SavedReportRow {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	dataSource: string;
	columnsJson: unknown;
	filtersJson: unknown;
	groupByJson: unknown;
	sortJson: unknown;
	chartType: string | null;
	isTemplate: boolean;
	sharedWithTeam: boolean;
	createdBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export const SavedReportMapper = {
	toDomain(row: SavedReportRow): SavedReport {
		const props: SavedReportProps = {
			id: row.id,
			organizationId: row.organizationId,
			name: row.name,
			description: row.description,
			dataSource: row.dataSource as DataSource,
			columns: (row.columnsJson as ReportColumn[]) ?? [],
			filters: (row.filtersJson as ReportFilter[]) ?? [],
			groupBy: (row.groupByJson as string[]) ?? [],
			sort: (row.sortJson as ReportSort[]) ?? [],
			chartType: (row.chartType as ChartType | null) ?? null,
			isTemplate: row.isTemplate,
			sharedWithTeam: row.sharedWithTeam,
			createdBy: row.createdBy,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
		return SavedReport.rehydrate(props);
	},

	toPersistence(report: SavedReport) {
		const p = report.toPrimitives();
		return {
			id: p.id,
			organizationId: p.organizationId,
			name: p.name,
			description: p.description,
			dataSource: p.dataSource,
			columnsJson: p.columns as never,
			filtersJson: p.filters as never,
			groupByJson: p.groupBy as never,
			sortJson: p.sort as never,
			chartType: p.chartType,
			isTemplate: p.isTemplate,
			sharedWithTeam: p.sharedWithTeam,
			createdBy: p.createdBy,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		};
	},

	toDto(report: SavedReport) {
		return report.toPrimitives();
	},
};

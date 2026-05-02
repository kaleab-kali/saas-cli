import { BadRequestException } from "@nestjs/common";
import {
	type ChartType,
	type DataSource,
	isChartType,
	isDataSource,
	type ReportColumn,
	type ReportFilter,
	type ReportSort,
} from "../value-objects/report.vo";

export interface SavedReportProps {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	dataSource: DataSource;
	columns: ReportColumn[];
	filters: ReportFilter[];
	groupBy: string[];
	sort: ReportSort[];
	chartType: ChartType | null;
	isTemplate: boolean;
	sharedWithTeam: boolean;
	createdBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export class SavedReport {
	private constructor(private props: SavedReportProps) {}

	static create(props: SavedReportProps): SavedReport {
		if (!props.name?.trim()) throw new BadRequestException("name required");
		if (!isDataSource(props.dataSource)) throw new BadRequestException(`invalid dataSource: ${props.dataSource}`);
		if (!props.columns?.length) throw new BadRequestException("at least one column required");
		if (props.chartType && !isChartType(props.chartType)) {
			throw new BadRequestException(`invalid chartType: ${props.chartType}`);
		}
		for (const c of props.columns) {
			if (!c.field || !c.label) throw new BadRequestException("column field + label required");
		}
		return new SavedReport(props);
	}

	static rehydrate(props: SavedReportProps): SavedReport {
		return new SavedReport(props);
	}

	get id() {
		return this.props.id;
	}
	get dataSource() {
		return this.props.dataSource;
	}

	update(input: Partial<Omit<SavedReportProps, "id" | "organizationId" | "createdAt" | "createdBy">>) {
		if (input.name !== undefined) {
			if (!input.name.trim()) throw new BadRequestException("name cannot be empty");
			this.props.name = input.name;
		}
		if (input.description !== undefined) this.props.description = input.description;
		if (input.columns !== undefined) {
			if (!input.columns.length) throw new BadRequestException("at least one column required");
			this.props.columns = input.columns;
		}
		if (input.filters !== undefined) this.props.filters = input.filters;
		if (input.groupBy !== undefined) this.props.groupBy = input.groupBy;
		if (input.sort !== undefined) this.props.sort = input.sort;
		if (input.chartType !== undefined) this.props.chartType = input.chartType;
		if (input.isTemplate !== undefined) this.props.isTemplate = input.isTemplate;
		if (input.sharedWithTeam !== undefined) this.props.sharedWithTeam = input.sharedWithTeam;
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}

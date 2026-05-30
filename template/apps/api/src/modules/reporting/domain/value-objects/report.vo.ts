export const DATA_SOURCES = ["user", "member", "audit_log", "notification"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const CHART_TYPES = ["table", "bar", "line", "pie", "stacked_bar"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const AGGREGATIONS = ["sum", "avg", "count", "min", "max"] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];

export const FILTER_OPERATORS = [
	"eq",
	"ne",
	"gt",
	"gte",
	"lt",
	"lte",
	"in",
	"contains",
	"between",
	"is_null",
	"is_not_null",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export const EXPORT_FORMATS = ["csv", "xlsx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXECUTION_STATUSES = ["pending", "running", "completed", "failed"] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const isDataSource = (v: string): v is DataSource => (DATA_SOURCES as readonly string[]).includes(v);
export const isChartType = (v: string): v is ChartType => (CHART_TYPES as readonly string[]).includes(v);
export const isFrequency = (v: string): v is ScheduleFrequency =>
	(SCHEDULE_FREQUENCIES as readonly string[]).includes(v);
export const isFormat = (v: string): v is ExportFormat => (EXPORT_FORMATS as readonly string[]).includes(v);

export interface ReportColumn {
	field: string;
	label: string;
	agg?: Aggregation;
}
export interface ReportFilter {
	field: string;
	operator: FilterOperator;
	value: unknown;
}
export interface ReportSort {
	field: string;
	dir: "asc" | "desc";
}

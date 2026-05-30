import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type DataSource = "user" | "member" | "audit_log" | "notification";

export type ChartType = "table" | "bar" | "line" | "pie" | "stacked_bar";
export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface ReportColumn {
	field: string;
	label: string;
	agg?: "sum" | "avg" | "count" | "min" | "max";
}
export interface ReportFilter {
	field: string;
	operator: string;
	value: unknown;
}
export interface ReportSort {
	field: string;
	dir: "asc" | "desc";
}

export interface SavedReport {
	id: string;
	name: string;
	description?: string | null;
	dataSource: DataSource;
	columns: ReportColumn[];
	filters: ReportFilter[];
	groupBy: string[];
	sort: ReportSort[];
	chartType?: ChartType | null;
	isTemplate: boolean;
	sharedWithTeam: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ReportSchedule {
	id: string;
	reportId: string;
	frequency: ScheduleFrequency;
	dayOfWeek?: number | null;
	dayOfMonth?: number | null;
	timeOfDay: string;
	recipients: string[];
	format: ExportFormat;
	enabled: boolean;
	lastRunAt?: string | null;
	nextRunAt?: string | null;
}

export interface ReportExecution {
	id: string;
	reportId: string;
	triggeredBy: string;
	status: string;
	rowCount: number;
	durationMs?: number | null;
	error?: string | null;
	createdAt: string;
	completedAt?: string | null;
}

const reportKeys = {
	all: ["reports"] as const,
	list: (p: Record<string, unknown>) => ["reports", "list", p] as const,
	detail: (id: string) => ["reports", "detail", id] as const,
	allowed: (ds: string) => ["reports", "allowed", ds] as const,
	schedules: ["report-schedules"] as const,
	executions: (reportId?: string) => ["report-executions", reportId] as const,
	dashboards: (kind: string, p: unknown) => ["dashboards", kind, p] as const,
};

export const useReports = (params: { dataSource?: string; isTemplate?: boolean } = {}) =>
	useQuery({
		queryKey: reportKeys.list(params),
		queryFn: () =>
			api.get<{ data: SavedReport[] }>("/reporting/reports", {
				params: params as Record<string, string | boolean | undefined>,
			}),
		select: (r) => r.data,
	});

export const useReport = (id: string) =>
	useQuery({
		queryKey: reportKeys.detail(id),
		queryFn: () => api.get<{ data: SavedReport }>(`/reporting/reports/${id}`),
		select: (r) => r.data,
		enabled: !!id,
	});

export const useAllowedFields = (dataSource: string) =>
	useQuery({
		queryKey: reportKeys.allowed(dataSource),
		queryFn: () => api.get<{ data: string[] }>(`/reporting/reports/allowed-fields/${dataSource}`),
		select: (r) => r.data,
		enabled: !!dataSource,
	});

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
	qc.invalidateQueries({ queryKey: reportKeys.all });
	qc.invalidateQueries({ queryKey: reportKeys.schedules });
};

export const useCreateReport = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: Partial<SavedReport> & { name: string; dataSource: DataSource; columns: ReportColumn[] }) =>
			api.post<{ data: SavedReport }>("/reporting/reports", dto),
		onSuccess: () => invalidate(qc),
		meta: { successMessage: "Report saved" },
	});
};

export const useUpdateReport = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (p: { id: string; dto: Partial<SavedReport> }) => api.patch(`/reporting/reports/${p.id}`, p.dto),
		onSuccess: () => invalidate(qc),
		meta: { successMessage: "Report updated" },
	});
};

export const useDeleteReport = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/reporting/reports/${id}`),
		onSuccess: () => invalidate(qc),
		meta: { successMessage: "Report deleted" },
	});
};

export const useExecuteReport = () => {
	return useMutation({
		mutationFn: (p: { id: string; format?: ExportFormat }) =>
			api.post<{ data: { headers: string[]; rows: Record<string, unknown>[] } }>(
				`/reporting/reports/${p.id}/execute`,
				p.format ? { format: p.format } : {},
			),
	});
};

export const useSchedules = (params: { reportId?: string; enabled?: boolean } = {}) =>
	useQuery({
		queryKey: [...reportKeys.schedules, params],
		queryFn: () =>
			api.get<{ data: ReportSchedule[] }>("/reporting/schedules", {
				params: params as Record<string, string | boolean | undefined>,
			}),
		select: (r) => r.data,
	});

export const useCreateSchedule = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			reportId: string;
			frequency: ScheduleFrequency;
			dayOfWeek?: number;
			dayOfMonth?: number;
			timeOfDay: string;
			recipients: string[];
			format: ExportFormat;
			enabled?: boolean;
		}) => api.post<{ data: ReportSchedule }>("/reporting/schedules", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.schedules }),
		meta: { successMessage: "Schedule created" },
	});
};

export const useCancelSchedule = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/reporting/schedules/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.schedules }),
		meta: { successMessage: "Schedule cancelled" },
	});
};

export const useExecutions = (reportId?: string) =>
	useQuery({
		queryKey: reportKeys.executions(reportId),
		queryFn: () =>
			api.get<{ data: ReportExecution[] }>("/reporting/executions", { params: reportId ? { reportId } : {} }),
		select: (r) => r.data,
	});

// Dashboards
export interface MainDashboard {
	kpis: Record<string, number>;
}

export const useMainDashboard = () =>
	useQuery({
		queryKey: reportKeys.dashboards("main", {}),
		queryFn: () => api.get<{ data: MainDashboard }>("/reporting/dashboards/main"),
		select: (r) => r.data,
	});

export const downloadDashboard = async (kind: "main", format: ExportFormat) => {
	const q = new URLSearchParams({
		format,
	});
	const res = await fetch(`/api/v1/reporting/dashboards/${kind}/export?${q.toString()}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error(`Export failed: ${res.status}`);
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const cd = res.headers.get("content-disposition") ?? "";
	const match = /filename="([^"]+)"/.exec(cd);
	a.download = match?.[1] ?? `dashboard-${kind}.${format}`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

export const executeReportDownload = async (id: string, format: ExportFormat) => {
	const res = await fetch(`/api/v1/reporting/reports/${id}/execute`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ format }),
	});
	if (!res.ok) throw new Error(`Export failed: ${res.status}`);
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const cd = res.headers.get("content-disposition") ?? "";
	const match = /filename="([^"]+)"/.exec(cd);
	a.download = match?.[1] ?? `report.${format}`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

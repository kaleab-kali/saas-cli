import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminAuditLogs } from "#features/admin/api/admin.queries";
import type { AuditLogEntry } from "#features/admin/types/admin.types";
import { DataTable, useDataTableState } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/audit-logs/")({
	component: AuditLogsPage,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

const shortId = (value: string | null | undefined) => {
	if (!value) return "-";
	return value.length > 16 ? `${value.slice(0, 12)}...` : value;
};

const summarizeDetails = (details: unknown) => {
	if (!details) return "-";
	if (typeof details === "string") return details;
	try {
		return JSON.stringify(details);
	} catch {
		return "unserializable details";
	}
};

const readFilter = (queryParams: Record<string, unknown>, key: string) => {
	const value = queryParams[`filter.${key}`];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const buildExportHref = (params: Record<string, string | number | undefined>) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") search.set(key, String(value));
	}
	const query = search.toString();
	return `/api/v1/admin/audit-logs/export${query ? `?${query}` : ""}`;
};

const columns: ColumnDef<AuditLogEntry, unknown>[] = [
	{
		accessorKey: "action",
		header: "Action",
		cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "targetType",
		header: "Target",
		cell: ({ row }) => (
			<div className="space-y-1">
				<div className="text-sm">{row.original.targetType}</div>
				<code className="block text-xs text-muted-foreground">{shortId(row.original.targetId)}</code>
			</div>
		),
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "performedBy",
		header: "Performed by",
		cell: ({ row }) => <code className="text-xs">{shortId(row.original.performedBy)}</code>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "targetId",
		header: "Target ID",
		cell: ({ row }) => <code className="text-xs">{shortId(row.original.targetId)}</code>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "ipAddress",
		header: "IP",
		cell: ({ row }) => <span className="text-muted-foreground">{row.original.ipAddress || "-"}</span>,
	},
	{
		id: "details",
		accessorFn: (row) => summarizeDetails(row.details),
		header: "Details",
		cell: ({ row }) => (
			<span className="block max-w-md truncate text-xs text-muted-foreground">
				{summarizeDetails(row.original.details)}
			</span>
		),
	},
	{
		accessorKey: "createdAt",
		header: "Date",
		cell: ({ row }) => (
			<span className="text-muted-foreground">{dateFormatter.format(new Date(row.original.createdAt))}</span>
		),
	},
];

function AuditLogsPage() {
	const { t } = useTranslation();
	const tableState = useDataTableState({ defaultPageSize: 50, defaultSort: [{ id: "createdAt", desc: true }] });
	const params = React.useMemo(
		() => ({
			page: tableState.page,
			limit: tableState.pageSize,
			search: tableState.search || undefined,
			sort: tableState.sort,
			action: readFilter(tableState.queryParams, "action"),
			targetType: readFilter(tableState.queryParams, "targetType"),
			performedBy: readFilter(tableState.queryParams, "performedBy"),
			targetId: readFilter(tableState.queryParams, "targetId"),
		}),
		[tableState.page, tableState.pageSize, tableState.queryParams, tableState.search, tableState.sort],
	);
	const { data, isLoading, error, refetch } = useAdminAuditLogs(params);
	const rows = data?.data ?? [];

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h1 className="text-2xl font-semibold">{t("admin.platformAuditLogsTitle")}</h1>
					<p className="mt-1 text-muted-foreground">{t("admin.platformAuditLogsDesc")}</p>
				</div>
				<a href={buildExportHref(params)} target="_blank" rel="noopener noreferrer">
					<Button variant="outline" size="sm">
						Export all CSV
					</Button>
				</a>
			</div>

			<Card>
				<CardContent className="pt-6">
					<DataTable
						columns={columns}
						data={rows}
						isLoading={isLoading}
						error={error}
						onRetry={() => void refetch()}
						searchPlaceholder="Search audit logs..."
						emptyTitle={t("admin.noAuditLogs")}
						emptyMessage="No platform audit events match the current filters."
						totalCount={data?.meta.total ?? 0}
						pageCount={data?.meta.totalPages ?? 0}
						enableCsvExport
						exportFilename="platform-audit-logs.csv"
						savedViewsEntity="admin-audit-logs"
						getRowId={(log) => log.id}
						{...tableState.tableProps}
						manualFiltering
					/>
				</CardContent>
			</Card>
		</div>
	);
}

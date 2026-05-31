import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type EmailDelivery,
	type EmailDeliveryListParams,
	useEmailDeliveries,
} from "#features/notifications/api/notification.hooks";
import { DataTable, useDataTableState } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/notifications/deliveries")({ component: Page });

const STATUS_FILTERS = ["all", "queued", "sent", "delivered", "failed", "bounced"] as const;
const SOURCE_FILTERS = ["all", "bulk", "transactional", "invoice", "digest"] as const;
const deliveryDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
type StatusFilter = (typeof STATUS_FILTERS)[number];
type SourceFilter = (typeof SOURCE_FILTERS)[number];

const badgeVariant = (status: string) => {
	if (status === "delivered" || status === "sent") return "default";
	if (status === "failed" || status === "bounced") return "destructive";
	return "secondary";
};

const statusFilterFromSearch = (value: unknown): StatusFilter =>
	typeof value === "string" && STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : "all";

const sourceFilterFromSearch = (value: unknown): SourceFilter =>
	typeof value === "string" && SOURCE_FILTERS.includes(value as SourceFilter) ? (value as SourceFilter) : "all";

function Page() {
	const { t } = useTranslation();
	const tableState = useDataTableState({ defaultPageSize: 20, defaultSort: [{ id: "createdAt", desc: true }] });
	const status = statusFilterFromSearch(tableState.urlSearch.status);
	const source = sourceFilterFromSearch(tableState.urlSearch.source);
	const setStatus = React.useCallback(
		(value: StatusFilter) => tableState.setSearchParams({ status: value === "all" ? undefined : value, page: 1 }),
		[tableState.setSearchParams],
	);
	const setSource = React.useCallback(
		(value: SourceFilter) => tableState.setSearchParams({ source: value === "all" ? undefined : value, page: 1 }),
		[tableState.setSearchParams],
	);
	const params = React.useMemo<EmailDeliveryListParams>(
		() => ({
			status: status === "all" ? undefined : status,
			source: source === "all" ? undefined : source,
			page: tableState.page,
			limit: tableState.pageSize,
			search: tableState.search || undefined,
			sort: tableState.sort,
		}),
		[source, status, tableState.page, tableState.pageSize, tableState.search, tableState.sort],
	);
	const { data, isLoading, error, refetch } = useEmailDeliveries(params);
	const rows = data?.data ?? [];

	const statusOptions = React.useMemo(
		() =>
			STATUS_FILTERS.map((value) => ({
				value,
				label: t(`notifications.deliveriesPage.statusFilters.${value}`),
			})),
		[t],
	);
	const sourceOptions = React.useMemo(
		() =>
			SOURCE_FILTERS.map((value) => ({
				value,
				label: t(`notifications.deliveriesPage.sourceFilters.${value}`),
			})),
		[t],
	);
	const columns = React.useMemo<ColumnDef<EmailDelivery, unknown>[]>(
		() => [
			{
				accessorKey: "createdAt",
				header: t("notifications.deliveriesPage.columns.time"),
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">
						{deliveryDateFormatter.format(new Date(row.original.createdAt))}
					</span>
				),
			},
			{
				accessorKey: "toEmail",
				header: t("notifications.deliveriesPage.columns.to"),
				cell: ({ row }) => <span className="font-medium">{row.original.toEmail}</span>,
			},
			{
				accessorKey: "subject",
				header: t("notifications.deliveriesPage.columns.subject"),
				cell: ({ row }) => <span className="block max-w-xs truncate">{row.original.subject}</span>,
			},
			{
				accessorKey: "source",
				header: t("notifications.deliveriesPage.columns.source"),
				cell: ({ row }) =>
					t(`notifications.deliveriesPage.sourceFilters.${row.original.source}`, {
						defaultValue: row.original.source,
					}),
			},
			{
				accessorKey: "status",
				header: t("notifications.deliveriesPage.columns.status"),
				cell: ({ row }) => (
					<Badge variant={badgeVariant(row.original.status)}>
						{t(`notifications.deliveriesPage.statusFilters.${row.original.status}`, {
							defaultValue: row.original.status,
						})}
					</Badge>
				),
			},
			{
				accessorKey: "attemptCount",
				header: t("notifications.deliveriesPage.columns.attempts"),
				cell: ({ row }) => <span className="text-muted-foreground">{row.original.attemptCount}</span>,
			},
			{
				accessorKey: "error",
				header: t("notifications.deliveriesPage.columns.error"),
				cell: ({ row }) => (
					<span className="block max-w-xs truncate text-xs text-destructive">{row.original.error ?? "-"}</span>
				),
			},
		],
		[t],
	);

	const toolbarActions = (
		<>
			<Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
				<SelectTrigger className="w-[140px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{statusOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
				<SelectTrigger className="w-[160px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{sourceOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</>
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h1 className="text-2xl font-semibold">{t("notifications.deliveriesTitle")}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{t("notifications.deliveriesPage.subtitle")}</p>
				</div>
			</div>

			<Card>
				<CardContent className="pt-6">
					<DataTable
						columns={columns}
						data={rows}
						isLoading={isLoading}
						error={error}
						onRetry={() => void refetch()}
						searchPlaceholder={t("notifications.deliveriesPage.searchPlaceholder")}
						emptyTitle={t("notifications.deliveriesPage.noEmailsTitle")}
						emptyMessage={t("notifications.deliveriesPage.noEmails")}
						totalCount={data?.meta.total ?? 0}
						pageCount={data?.meta.totalPages ?? 0}
						toolbarActions={toolbarActions}
						enableCsvExport
						exportFilename="email-deliveries.csv"
						savedViewsEntity="notification-deliveries"
						getRowId={(delivery) => delivery.id}
						{...tableState.tableProps}
						manualFiltering
					/>
				</CardContent>
			</Card>
		</div>
	);
}

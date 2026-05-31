import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import type { OrgListItem } from "#features/admin/types/admin.types";
import { DataTable, useDataTableState } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

function buildColumns(t: (key: string) => string): ColumnDef<OrgListItem, unknown>[] {
	return [
		{
			accessorKey: "name",
			header: t("admin.orgHeader"),
			cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "slug",
			header: t("admin.slugHeader"),
			cell: ({ row }) => <Badge variant="secondary">{row.original.slug || "-"}</Badge>,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "ownerEmail",
			header: t("admin.ownerHeader"),
			cell: ({ row }) => <span className="text-muted-foreground">{row.original.ownerEmail || "-"}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "memberCount",
			header: t("admin.membersHeader"),
			enableSorting: false,
			cell: ({ row }) => <span className="font-mono">{row.original.memberCount}</span>,
			meta: { className: "text-right", headerClassName: "text-right" },
		},
		{
			accessorKey: "createdAt",
			header: t("admin.createdHeader"),
			cell: ({ row }) => (
				<span className="text-muted-foreground">{dateFormatter.format(new Date(row.original.createdAt))}</span>
			),
		},
		{
			id: "actions",
			header: t("admin.actionsHeader"),
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<Link to="/admin/organizations/$orgId" params={{ orgId: row.original.id }}>
					<Button variant="outline" size="sm">
						{t("admin.viewBtn")}
					</Button>
				</Link>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

export const OrgTable = React.memo(() => {
	const { t } = useTranslation();
	const tableState = useDataTableState({ defaultPageSize: 20, defaultSort: [{ id: "createdAt", desc: true }] });
	const { data, isLoading, error, refetch } = useAdminOrgList({
		page: tableState.page,
		limit: tableState.pageSize,
		search: tableState.search || undefined,
		sort: tableState.sort,
	});
	const columns = React.useMemo(() => buildColumns(t), [t]);

	return (
		<Card>
			<CardContent className="pt-6">
				<DataTable
					columns={columns}
					data={data?.data ?? []}
					isLoading={isLoading}
					error={error}
					onRetry={() => void refetch()}
					searchPlaceholder={t("admin.searchOrgsPlaceholder")}
					emptyTitle={t("admin.noOrgs")}
					emptyMessage="No tenant organizations match the current filters."
					totalCount={data?.meta.total ?? 0}
					pageCount={data?.meta.totalPages ?? 0}
					enableCsvExport
					exportFilename="platform-organizations.csv"
					savedViewsEntity="admin-organizations"
					getRowId={(org) => org.id}
					{...tableState.tableProps}
					manualFiltering
				/>
			</CardContent>
		</Card>
	);
});
OrgTable.displayName = "OrgTable";

import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminUserList } from "#features/admin/api/admin.queries";
import { impersonateUrl, useForcePasswordReset } from "#features/admin/api/admin-user-actions.hooks";
import type { PlatformUser } from "#features/admin/types/admin.types";
import { DataTable, useDataTableState } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/users/")({
	component: UsersPage,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const readFilter = (queryParams: Record<string, unknown>, key: string) => {
	const value = queryParams[`filter.${key}`];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const UserActions = React.memo(
	({ userId, email }: { readonly userId: string; readonly email: string }) => {
		const { t } = useTranslation();
		const forceReset = useForcePasswordReset();

		const handleReset = React.useCallback(async () => {
			if (!window.confirm(t("admin.usersPage.resetConfirm", { email }))) return;
			await forceReset.mutateAsync(userId);
			window.alert(t("admin.usersPage.resetDone"));
		}, [forceReset, userId, email, t]);

		const handleImpersonate = React.useCallback(() => {
			if (!window.confirm(t("admin.usersPage.impersonateConfirm", { email }))) return;
			window.location.href = impersonateUrl(userId);
		}, [userId, email, t]);

		return (
			<div className="flex justify-end gap-1">
				<Button size="sm" variant="outline" onClick={handleImpersonate} title={t("admin.usersPage.impersonateTitle")}>
					{t("admin.usersPage.impersonate")}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="text-destructive"
					onClick={handleReset}
					disabled={forceReset.isPending}
				>
					{t("admin.usersPage.resetPasswordShort")}
				</Button>
			</div>
		);
	},
	(prev, next) => prev.userId === next.userId && prev.email === next.email,
);
UserActions.displayName = "UserActions";

function buildColumns(t: (key: string) => string): ColumnDef<PlatformUser, unknown>[] {
	return [
		{
			accessorKey: "name",
			header: t("admin.nameCol"),
			cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "email",
			header: t("admin.emailCol"),
			cell: ({ row }) => <span>{row.original.email}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "emailVerified",
			header: t("admin.verifiedCol"),
			cell: ({ row }) =>
				row.original.emailVerified ? (
					<Badge variant="default">{t("admin.verified")}</Badge>
				) : (
					<Badge variant="secondary">{t("admin.unverified")}</Badge>
				),
			meta: { filter: { type: "boolean" } },
		},
		{
			id: "organizations",
			accessorFn: (user) => user.organizations.map((org) => `${org.name} ${org.role}`).join(" "),
			header: t("admin.orgsCol"),
			cell: ({ row }) =>
				row.original.organizations.length === 0 ? (
					<span className="text-sm text-muted-foreground">{t("admin.noneLabel")}</span>
				) : (
					<div className="flex max-w-md flex-wrap gap-1">
						{row.original.organizations.map((org) => (
							<Badge key={org.id} variant="outline" className="text-xs">
								{org.name} ({org.role})
							</Badge>
						))}
					</div>
				),
		},
		{
			accessorKey: "createdAt",
			header: t("admin.joinedCol"),
			cell: ({ row }) => (
				<span className="text-muted-foreground">{dateFormatter.format(new Date(row.original.createdAt))}</span>
			),
		},
		{
			id: "actions",
			header: t("admin.usersPage.actions"),
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => <UserActions userId={row.original.id} email={row.original.email} />,
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

function UsersPage() {
	const { t } = useTranslation();
	const tableState = useDataTableState({ defaultPageSize: 50, defaultSort: [{ id: "createdAt", desc: true }] });
	const params = React.useMemo(
		() => ({
			page: tableState.page,
			limit: tableState.pageSize,
			search:
				tableState.search || readFilter(tableState.queryParams, "name") || readFilter(tableState.queryParams, "email"),
			sort: tableState.sort,
			verified: readFilter(tableState.queryParams, "emailVerified"),
		}),
		[tableState.page, tableState.pageSize, tableState.queryParams, tableState.search, tableState.sort],
	);
	const { data, isLoading, error, refetch } = useAdminUserList(params);
	const users = data?.data ?? [];
	const columns = React.useMemo(() => buildColumns(t), [t]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.allUsers")}</h1>
				<p className="mt-1 text-muted-foreground">{t("admin.allUsersDesc")}</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<DataTable
						columns={columns}
						data={users}
						isLoading={isLoading}
						error={error}
						onRetry={() => void refetch()}
						searchPlaceholder={t("admin.searchUsersPlaceholder")}
						emptyTitle={t("admin.noUsersFound")}
						emptyMessage="No platform users match the current filters."
						totalCount={data?.meta.total ?? 0}
						pageCount={data?.meta.totalPages ?? 0}
						enableCsvExport
						exportFilename="platform-users.csv"
						savedViewsEntity="admin-users"
						getRowId={(user) => user.id}
						{...tableState.tableProps}
						manualFiltering
					/>
				</CardContent>
			</Card>
		</div>
	);
}

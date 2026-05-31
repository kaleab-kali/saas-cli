import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { type AdminSubscriptionSummary, useAdminSubscriptions } from "#features/admin/api/admin-billing.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	trialing: "default",
	past_due: "secondary",
	grace: "secondary",
	read_only: "secondary",
	locked: "destructive",
	suspended: "destructive",
	canceled: "outline",
};

const statusOptions = ["active", "trialing", "past_due", "grace", "read_only", "locked", "suspended", "canceled"];
const periodDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const formatMinor = (amountMinor: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);

function statusLabel(status: string) {
	return status.replace("_", " ");
}

function buildColumns(
	t: (key: string, options?: { readonly defaultValue?: string }) => string,
): ColumnDef<AdminSubscriptionSummary, unknown>[] {
	return [
		{
			id: "organization",
			accessorFn: (subscription) => subscription.organizationName ?? subscription.organizationId,
			header: t("admin.billing.col.organization", { defaultValue: "Organization" }),
			cell: ({ row }) => (
				<div>
					<div className="font-medium text-sm">{row.original.organizationName ?? "-"}</div>
					<div className="text-[11px] text-muted-foreground font-mono">{row.original.organizationId}</div>
				</div>
			),
			meta: { filter: { type: "text" } },
		},
		{
			id: "plan",
			accessorFn: (subscription) => subscription.plan.nameEn,
			header: t("admin.billing.col.plan", { defaultValue: "Plan" }),
			cell: ({ row }) => row.original.plan.nameEn,
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "status",
			header: t("admin.billing.col.status", { defaultValue: "Status" }),
			cell: ({ row }) => (
				<Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"} className="text-xs capitalize">
					{t(`admin.billing.status.${row.original.status}`, { defaultValue: statusLabel(row.original.status) })}
				</Badge>
			),
			meta: {
				filter: {
					type: "select",
					options: statusOptions.map((statusName) => ({
						value: statusName,
						label: t(`admin.billing.status.${statusName}`, { defaultValue: statusLabel(statusName) }),
					})),
				},
			},
		},
		{
			accessorKey: "billingInterval",
			header: t("admin.billing.col.interval", { defaultValue: "Interval" }),
			cell: ({ row }) => <span className="capitalize">{row.original.billingInterval}</span>,
		},
		{
			accessorKey: "currentPeriodEnd",
			header: t("admin.billing.col.periodEnd", { defaultValue: "Period End" }),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{periodDateFormatter.format(new Date(row.original.currentPeriodEnd))}
				</span>
			),
		},
		{
			accessorKey: "creditBalanceMinor",
			header: t("admin.billing.col.credit", { defaultValue: "Credit" }),
			cell: ({ row }) => (
				<span className="font-mono">{formatMinor(row.original.creditBalanceMinor, row.original.currency)}</span>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
		{
			id: "actions",
			header: t("common.actions"),
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<Link to="/admin/billing/$subscriptionId" params={{ subscriptionId: row.original.id }}>
					<Button variant="outline" size="sm">
						{t("admin.billing.manage", { defaultValue: "Manage" })}
					</Button>
				</Link>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

const BillingIndex = React.memo(
	() => {
		const { t } = useTranslation();
		const [status, setStatus] = React.useState<string>("all");
		const { data: subs = [], isLoading } = useAdminSubscriptions(status === "all" ? undefined : status);
		const columns = React.useMemo(() => buildColumns(t), [t]);
		const counts = React.useMemo(() => {
			const byStatus: Record<string, number> = {};
			for (const s of subs) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
			return byStatus;
		}, [subs]);

		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h1 className="text-2xl font-semibold">
							{t("admin.billing.title", { defaultValue: "Billing & Subscriptions" })}
						</h1>
						<p className="text-sm text-muted-foreground">
							{t("admin.billing.subtitle", { defaultValue: "Manage subscriptions, invoices and manual payments." })}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Link to="/admin/billing/dashboard" className="text-sm text-primary hover:underline mr-2">
							KPI Dashboard -&gt;
						</Link>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("admin.billing.allStatuses", { defaultValue: "All statuses" })}</SelectItem>
								{statusOptions.map((s) => (
									<SelectItem key={s} value={s}>
										{t(`admin.billing.status.${s}`, { defaultValue: statusLabel(s) })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
					{statusOptions.map((s) => (
						<Card key={s}>
							<CardContent className="py-3 text-center">
								<div className="text-xs text-muted-foreground uppercase">
									{t(`admin.billing.status.${s}`, { defaultValue: statusLabel(s) })}
								</div>
								<div className="text-lg font-semibold">{counts[s] ?? 0}</div>
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardContent className="pt-6">
						<DataTable
							columns={columns}
							data={subs}
							isLoading={isLoading}
							searchPlaceholder="Search subscriptions..."
							emptyTitle={t("admin.billing.noSubs", { defaultValue: "No subscriptions." })}
							emptyMessage="No subscriptions match the current filters."
							enableCsvExport
							exportFilename="admin-subscriptions.csv"
							savedViewsEntity="admin-billing-subscriptions"
							getRowId={(subscription) => subscription.id}
							pageSize={20}
						/>
					</CardContent>
				</Card>
			</div>
		);
	},
	() => true,
);
BillingIndex.displayName = "BillingIndex";

export const Route = createFileRoute("/admin/billing/")({
	component: BillingIndex,
});

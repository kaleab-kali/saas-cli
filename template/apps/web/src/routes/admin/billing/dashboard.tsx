import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
	type PastDueInvoice,
	type PendingPayment,
	useBillingDashboard,
	usePastDueInvoices,
	usePendingVerification,
	useRevenueTrend,
	useVerifyPayment,
} from "#features/admin/api/admin-billing-dashboard.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PlanRevenueRow {
	readonly slug: string;
	readonly count: number;
	readonly mrrMinor: number;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtMinor = (amountMinor: number, currency = "USD") =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);

const planRevenueColumns: ColumnDef<PlanRevenueRow, unknown>[] = [
	{
		accessorKey: "slug",
		header: "Plan",
		cell: ({ row }) => <span className="font-mono">{row.original.slug}</span>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "count",
		header: "Subs",
		cell: ({ row }) => row.original.count,
		meta: { className: "text-right", headerClassName: "text-right" },
	},
	{
		accessorKey: "mrrMinor",
		header: "MRR",
		cell: ({ row }) => <span className="font-mono">{fmtMinor(Math.round(row.original.mrrMinor))}</span>,
		meta: { className: "text-right", headerClassName: "text-right" },
	},
];

const pastDueColumns: ColumnDef<PastDueInvoice, unknown>[] = [
	{
		accessorKey: "number",
		header: "Invoice",
		cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
		meta: { filter: { type: "text" } },
	},
	{
		id: "organization",
		accessorFn: (invoice) => invoice.organizationName ?? invoice.organizationId,
		header: "Org",
		cell: ({ row }) => (
			<div>
				<div className="text-sm">{row.original.organizationName ?? "-"}</div>
				<div className="text-[10px] text-muted-foreground font-mono">{row.original.organizationId}</div>
			</div>
		),
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "daysPastDue",
		header: "Days late",
		cell: ({ row }) => <Badge variant="destructive">{row.original.daysPastDue}d</Badge>,
		meta: { className: "text-right", headerClassName: "text-right" },
	},
	{
		id: "outstanding",
		accessorFn: (invoice) => invoice.totalMinor - invoice.amountPaidMinor,
		header: "Outstanding",
		cell: ({ row }) => (
			<span className="font-mono text-destructive">
				{fmtMinor(Math.round(row.original.totalMinor - row.original.amountPaidMinor), row.original.currency)}
			</span>
		),
		meta: { className: "text-right", headerClassName: "text-right" },
	},
	{
		id: "actions",
		header: "",
		enableSorting: false,
		enableColumnFilter: false,
		cell: ({ row }) => (
			<Link
				to="/admin/billing/$subscriptionId"
				params={{ subscriptionId: row.original.subscriptionId }}
				className="text-primary hover:underline text-xs"
			>
				Manage
			</Link>
		),
		meta: { className: "text-right", headerClassName: "text-right" },
	},
];

function buildPendingPaymentColumns(verify: ReturnType<typeof useVerifyPayment>): ColumnDef<PendingPayment, unknown>[] {
	return [
		{
			accessorKey: "invoiceNumber",
			header: "Invoice",
			cell: ({ row }) => <span className="font-medium">{row.original.invoiceNumber ?? "-"}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			id: "organization",
			accessorFn: (payment) => payment.organizationName ?? payment.organizationId,
			header: "Org",
			cell: ({ row }) => (
				<div>
					<div className="text-sm">{row.original.organizationName ?? "-"}</div>
					<div className="text-[10px] text-muted-foreground font-mono">{row.original.organizationId}</div>
				</div>
			),
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "method",
			header: "Method",
			cell: ({ row }) => <span className="capitalize">{row.original.method.replace("_", " ")}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			id: "reference",
			accessorFn: (payment) => payment.receiptNumber || payment.bankReference || "",
			header: "Reference",
			cell: ({ row }) => (
				<span className="font-mono text-xs">{row.original.receiptNumber || row.original.bankReference || "-"}</span>
			),
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "amountMinor",
			header: "Amount",
			cell: ({ row }) => (
				<span className="font-mono">{fmtMinor(Math.round(row.original.amountMinor), row.original.currency)}</span>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
		{
			accessorKey: "paidAt",
			header: "Paid on",
			cell: ({ row }) => (
				<span className="text-muted-foreground">{dateFormatter.format(new Date(row.original.paidAt))}</span>
			),
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<Button size="sm" onClick={() => verify.mutate(row.original.id)} disabled={verify.isPending}>
					Verify
				</Button>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

const RevenueTrendChart = React.memo(
	() => {
		const { data = [], isLoading } = useRevenueTrend();
		if (isLoading) return <Skeleton className="h-64 w-full" />;
		return (
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
						<XAxis dataKey="month" tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmt(v)} />
						<Tooltip
							contentStyle={{ background: "var(--background)", border: "1px solid var(--border)" }}
							formatter={(v) => [fmtMinor(Number(v ?? 0)), "Revenue"]}
						/>
						<Bar dataKey="revenueMinor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		);
	},
	() => true,
);
RevenueTrendChart.displayName = "RevenueTrendChart";

const PastDueTable = React.memo(
	() => {
		const { data = [], isLoading } = usePastDueInvoices();
		return (
			<DataTable
				columns={pastDueColumns}
				data={data}
				isLoading={isLoading}
				searchPlaceholder="Search past-due invoices..."
				emptyTitle="No past-due invoices"
				emptyMessage="No invoices currently need overdue follow-up."
				enableCsvExport
				exportFilename="past-due-invoices.csv"
				savedViewsEntity="admin-billing-past-due"
				getRowId={(invoice) => invoice.id}
				pageSize={10}
			/>
		);
	},
	() => true,
);
PastDueTable.displayName = "PastDueTable";

const PendingVerificationTable = React.memo(
	() => {
		const { data = [], isLoading } = usePendingVerification();
		const verify = useVerifyPayment();
		const columns = React.useMemo(() => buildPendingPaymentColumns(verify), [verify]);
		return (
			<DataTable
				columns={columns}
				data={data}
				isLoading={isLoading}
				searchPlaceholder="Search pending payments..."
				emptyTitle="No pending verifications"
				emptyMessage="All manual payments have been verified."
				enableCsvExport
				exportFilename="pending-payment-verifications.csv"
				savedViewsEntity="admin-billing-pending-payments"
				getRowId={(payment) => payment.id}
				pageSize={10}
			/>
		);
	},
	() => true,
);
PendingVerificationTable.displayName = "PendingVerificationTable";

function PlanRevenueTable({ rows }: { readonly rows: readonly PlanRevenueRow[] }) {
	return (
		<DataTable
			columns={planRevenueColumns}
			data={rows}
			searchPlaceholder="Search plan revenue..."
			emptyTitle="No plan revenue"
			emptyMessage="No subscription revenue has been recorded yet."
			enableCsvExport
			exportFilename="revenue-by-plan.csv"
			savedViewsEntity="admin-billing-revenue-by-plan"
			getRowId={(row) => row.slug}
			pageSize={10}
		/>
	);
}

const BillingDashboard = React.memo(
	() => {
		const { data, isLoading } = useBillingDashboard();

		const planRevenueRows = React.useMemo<PlanRevenueRow[]>(() => {
			if (!data) return [];
			return Object.entries(data.byPlan)
				.map(([slug, stats]) => ({ slug, count: stats.count, mrrMinor: stats.mrrMinor }))
				.sort((a, b) => b.mrrMinor - a.mrrMinor);
		}, [data]);

		if (isLoading) return <Skeleton className="h-96 w-full" />;
		if (!data) return null;

		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Billing Dashboard</h1>
						<p className="text-sm text-muted-foreground">Platform-wide revenue and subscription health.</p>
					</div>
					<Link to="/admin/billing" className="text-sm text-primary hover:underline">
						View all subscriptions
					</Link>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">MRR</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold font-mono">{fmtMinor(data.mrrMinor)}</div>
							<div className="text-xs text-muted-foreground">Monthly recurring revenue</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">ARR</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold font-mono">{fmtMinor(data.arrMinor)}</div>
							<div className="text-xs text-muted-foreground">Annualized</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">Outstanding</CardTitle>
						</CardHeader>
						<CardContent>
							<div className={`text-2xl font-bold font-mono ${data.outstandingMinor > 0 ? "text-destructive" : ""}`}>
								{fmtMinor(data.outstandingMinor)}
							</div>
							<div className="text-xs text-muted-foreground">Unpaid invoices</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">Collected (30d)</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold font-mono">{fmtMinor(data.paidLast30Minor)}</div>
							<div className="text-xs text-muted-foreground">Paid invoices</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base" role="heading" aria-level={2}>
							Revenue trend (12 months)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<RevenueTrendChart />
					</CardContent>
				</Card>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base" role="heading" aria-level={2}>
								Subscriptions by status
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								{["active", "trialing", "past_due", "grace", "read_only", "locked", "suspended", "canceled"].map(
									(s) => (
										<li key={s} className="flex items-center justify-between text-sm">
											<span className="capitalize">{s.replace("_", " ")}</span>
											<Badge variant="outline">{data.countsByStatus[s] ?? 0}</Badge>
										</li>
									),
								)}
							</ul>
							<div className="pt-3 mt-3 border-t text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Total subscriptions</span>
									<span className="font-medium">{data.totalSubs}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Renewing next 30d</span>
									<span className="font-medium">{data.upcomingRenewals30d}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base" role="heading" aria-level={2}>
								Revenue by plan
							</CardTitle>
						</CardHeader>
						<CardContent>
							<PlanRevenueTable rows={planRevenueRows} />
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base" role="heading" aria-level={2}>
							Past-due invoices
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PastDueTable />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base" role="heading" aria-level={2}>
							Manual payments awaiting verification
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PendingVerificationTable />
					</CardContent>
				</Card>
			</div>
		);
	},
	() => true,
);
BillingDashboard.displayName = "BillingDashboard";

export const Route = createFileRoute("/admin/billing/dashboard")({
	component: BillingDashboard,
});

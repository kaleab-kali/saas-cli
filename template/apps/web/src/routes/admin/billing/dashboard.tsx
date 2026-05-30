import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
	useBillingDashboard,
	usePastDueInvoices,
	usePendingVerification,
	useRevenueTrend,
	useVerifyPayment,
} from "#features/admin/api/admin-billing-dashboard.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtMinor = (amountMinor: number, currency = "USD") =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);

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
		if (isLoading) return <Skeleton className="h-48 w-full" />;
		if (data.length === 0)
			return <p className="text-sm text-muted-foreground py-4 text-center">No past-due invoices.</p>;
		return (
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-muted/40">
						<tr>
							<th className="text-left p-2">Invoice</th>
							<th className="text-left p-2">Org</th>
							<th className="text-right p-2">Days late</th>
							<th className="text-right p-2">Outstanding</th>
							<th className="text-left p-2" />
						</tr>
					</thead>
					<tbody>
						{data.map((inv) => {
							const outstanding = inv.totalMinor - inv.amountPaidMinor;
							return (
								<tr key={inv.id} className="border-t">
									<td className="p-2 font-medium">{inv.number}</td>
									<td className="p-2">
										<div className="text-sm">{inv.organizationName ?? "—"}</div>
										<div className="text-[10px] text-muted-foreground font-mono">{inv.organizationId}</div>
									</td>
									<td className="p-2 text-right">
										<Badge variant="destructive">{inv.daysPastDue}d</Badge>
									</td>
									<td className="p-2 text-right font-mono text-destructive">
										{fmtMinor(Math.round(outstanding), inv.currency)}
									</td>
									<td className="p-2">
										<Link
											to="/admin/billing/$subscriptionId"
											params={{ subscriptionId: inv.subscriptionId }}
											className="text-primary hover:underline text-xs"
										>
											manage →
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	},
	() => true,
);
PastDueTable.displayName = "PastDueTable";

const PendingVerificationTable = React.memo(
	() => {
		const { data = [], isLoading } = usePendingVerification();
		const verify = useVerifyPayment();
		if (isLoading) return <Skeleton className="h-48 w-full" />;
		if (data.length === 0)
			return <p className="text-sm text-muted-foreground py-4 text-center">No pending verifications.</p>;
		return (
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-muted/40">
						<tr>
							<th className="text-left p-2">Invoice</th>
							<th className="text-left p-2">Org</th>
							<th className="text-left p-2">Method</th>
							<th className="text-left p-2">Reference</th>
							<th className="text-right p-2">Amount</th>
							<th className="text-left p-2">Paid on</th>
							<th className="text-right p-2" />
						</tr>
					</thead>
					<tbody>
						{data.map((p) => (
							<tr key={p.id} className="border-t">
								<td className="p-2 font-medium">{p.invoiceNumber ?? "—"}</td>
								<td className="p-2">
									<div className="text-sm">{p.organizationName ?? "—"}</div>
									<div className="text-[10px] text-muted-foreground font-mono">{p.organizationId}</div>
								</td>
								<td className="p-2 capitalize">{p.method.replace("_", " ")}</td>
								<td className="p-2 font-mono text-xs">{p.receiptNumber || p.bankReference || "—"}</td>
								<td className="p-2 text-right font-mono">{fmtMinor(Math.round(p.amountMinor), p.currency)}</td>
								<td className="p-2">{new Date(p.paidAt).toLocaleDateString()}</td>
								<td className="p-2 text-right">
									<Button size="sm" onClick={() => verify.mutate(p.id)} disabled={verify.isPending}>
										Verify
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	},
	() => true,
);
PendingVerificationTable.displayName = "PendingVerificationTable";

const BillingDashboard = React.memo(
	() => {
		const { data, isLoading } = useBillingDashboard();

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
						→ View all subscriptions
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
						<CardTitle className="text-base">Revenue trend (12 months)</CardTitle>
					</CardHeader>
					<CardContent>
						<RevenueTrendChart />
					</CardContent>
				</Card>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Subscriptions by status</CardTitle>
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
							<CardTitle className="text-base">Revenue by plan</CardTitle>
						</CardHeader>
						<CardContent>
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-muted-foreground border-b">
										<th className="pb-2">Plan</th>
										<th className="pb-2 text-right">Subs</th>
										<th className="pb-2 text-right">MRR</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(data.byPlan)
										.sort(([, a], [, b]) => b.mrrMinor - a.mrrMinor)
										.map(([slug, stats]) => (
											<tr key={slug} className="border-b last:border-0">
												<td className="py-2 font-mono">{slug}</td>
												<td className="py-2 text-right">{stats.count}</td>
												<td className="py-2 text-right font-mono">{fmtMinor(Math.round(stats.mrrMinor))}</td>
											</tr>
										))}
								</tbody>
							</table>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Past-due invoices</CardTitle>
					</CardHeader>
					<CardContent>
						<PastDueTable />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Manual payments awaiting verification</CardTitle>
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

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
				<Table className="w-full text-sm">
					<TableHeader className="bg-muted/40">
						<TableRow>
							<TableHead className="text-left p-2">Invoice</TableHead>
							<TableHead className="text-left p-2">Org</TableHead>
							<TableHead className="text-right p-2">Days late</TableHead>
							<TableHead className="text-right p-2">Outstanding</TableHead>
							<TableHead className="text-left p-2" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((inv) => {
							const outstanding = inv.totalMinor - inv.amountPaidMinor;
							return (
								<TableRow key={inv.id} className="border-t">
									<TableCell className="p-2 font-medium">{inv.number}</TableCell>
									<TableCell className="p-2">
										<div className="text-sm">{inv.organizationName ?? "—"}</div>
										<div className="text-[10px] text-muted-foreground font-mono">{inv.organizationId}</div>
									</TableCell>
									<TableCell className="p-2 text-right">
										<Badge variant="destructive">{inv.daysPastDue}d</Badge>
									</TableCell>
									<TableCell className="p-2 text-right font-mono text-destructive">
										{fmtMinor(Math.round(outstanding), inv.currency)}
									</TableCell>
									<TableCell className="p-2">
										<Link
											to="/admin/billing/$subscriptionId"
											params={{ subscriptionId: inv.subscriptionId }}
											className="text-primary hover:underline text-xs"
										>
											manage →
										</Link>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
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
				<Table className="w-full text-sm">
					<TableHeader className="bg-muted/40">
						<TableRow>
							<TableHead className="text-left p-2">Invoice</TableHead>
							<TableHead className="text-left p-2">Org</TableHead>
							<TableHead className="text-left p-2">Method</TableHead>
							<TableHead className="text-left p-2">Reference</TableHead>
							<TableHead className="text-right p-2">Amount</TableHead>
							<TableHead className="text-left p-2">Paid on</TableHead>
							<TableHead className="text-right p-2" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((p) => (
							<TableRow key={p.id} className="border-t">
								<TableCell className="p-2 font-medium">{p.invoiceNumber ?? "—"}</TableCell>
								<TableCell className="p-2">
									<div className="text-sm">{p.organizationName ?? "—"}</div>
									<div className="text-[10px] text-muted-foreground font-mono">{p.organizationId}</div>
								</TableCell>
								<TableCell className="p-2 capitalize">{p.method.replace("_", " ")}</TableCell>
								<TableCell className="p-2 font-mono text-xs">{p.receiptNumber || p.bankReference || "—"}</TableCell>
								<TableCell className="p-2 text-right font-mono">
									{fmtMinor(Math.round(p.amountMinor), p.currency)}
								</TableCell>
								<TableCell className="p-2">{new Date(p.paidAt).toLocaleDateString()}</TableCell>
								<TableCell className="p-2 text-right">
									<Button size="sm" onClick={() => verify.mutate(p.id)} disabled={verify.isPending}>
										Verify
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
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
							<Table className="w-full text-sm">
								<TableHeader>
									<TableRow className="text-left text-muted-foreground border-b">
										<TableHead className="pb-2">Plan</TableHead>
										<TableHead className="pb-2 text-right">Subs</TableHead>
										<TableHead className="pb-2 text-right">MRR</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{Object.entries(data.byPlan)
										.sort(([, a], [, b]) => b.mrrMinor - a.mrrMinor)
										.map(([slug, stats]) => (
											<TableRow key={slug} className="border-b last:border-0">
												<TableCell className="py-2 font-mono">{slug}</TableCell>
												<TableCell className="py-2 text-right">{stats.count}</TableCell>
												<TableCell className="py-2 text-right font-mono">
													{fmtMinor(Math.round(stats.mrrMinor))}
												</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
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

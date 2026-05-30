import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminSubscriptions } from "#features/admin/api/admin-billing.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const formatMinor = (amountMinor: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);

const BillingIndex = React.memo(
	() => {
		const { t } = useTranslation();
		const [status, setStatus] = React.useState<string>("all");
		const { data: subs = [], isLoading } = useAdminSubscriptions(status === "all" ? undefined : status);
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
							KPI Dashboard →
						</Link>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("admin.billing.allStatuses", { defaultValue: "All statuses" })}</SelectItem>
								{["active", "trialing", "past_due", "grace", "read_only", "locked", "suspended", "canceled"].map(
									(s) => (
										<SelectItem key={s} value={s}>
											{t(`admin.billing.status.${s}`, { defaultValue: s.replace("_", " ") })}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
					{["active", "trialing", "past_due", "grace", "read_only", "locked", "suspended", "canceled"].map((s) => (
						<Card key={s}>
							<CardContent className="py-3 text-center">
								<div className="text-xs text-muted-foreground uppercase">
									{t(`admin.billing.status.${s}`, { defaultValue: s.replace("_", " ") })}
								</div>
								<div className="text-lg font-semibold">{counts[s] ?? 0}</div>
							</CardContent>
						</Card>
					))}
				</div>

				{isLoading ? (
					<Skeleton className="h-96 w-full" />
				) : subs.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center text-muted-foreground">
							{t("admin.billing.noSubs", { defaultValue: "No subscriptions." })}
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardContent className="p-0 overflow-x-auto">
							<Table className="w-full text-sm">
								<TableHeader className="bg-muted/40">
									<TableRow>
										<TableHead className="text-left p-2">
											{t("admin.billing.col.organization", { defaultValue: "Organization" })}
										</TableHead>
										<TableHead className="text-left p-2">
											{t("admin.billing.col.plan", { defaultValue: "Plan" })}
										</TableHead>
										<TableHead className="text-left p-2">
											{t("admin.billing.col.status", { defaultValue: "Status" })}
										</TableHead>
										<TableHead className="text-left p-2">
											{t("admin.billing.col.interval", { defaultValue: "Interval" })}
										</TableHead>
										<TableHead className="text-left p-2">
											{t("admin.billing.col.periodEnd", { defaultValue: "Period End" })}
										</TableHead>
										<TableHead className="text-right p-2">
											{t("admin.billing.col.credit", { defaultValue: "Credit" })}
										</TableHead>
										<TableHead className="text-right p-2">{t("common.actions")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{subs.map((s) => (
										<TableRow key={s.id} className="border-t">
											<TableCell className="p-2">
												<div className="font-medium text-sm">{s.organizationName ?? "—"}</div>
												<div className="text-[11px] text-muted-foreground font-mono">{s.organizationId}</div>
											</TableCell>
											<TableCell className="p-2">{s.plan.nameEn}</TableCell>
											<TableCell className="p-2">
												<Badge variant={STATUS_VARIANT[s.status] ?? "outline"} className="text-xs capitalize">
													{t(`admin.billing.status.${s.status}`, { defaultValue: s.status.replace("_", " ") })}
												</Badge>
											</TableCell>
											<TableCell className="p-2">{s.billingInterval}</TableCell>
											<TableCell className="p-2">{new Date(s.currentPeriodEnd).toLocaleDateString()}</TableCell>
											<TableCell className="p-2 text-right font-mono">
												{formatMinor(s.creditBalanceMinor, s.currency)}
											</TableCell>
											<TableCell className="p-2 text-right">
												<Link to="/admin/billing/$subscriptionId" params={{ subscriptionId: s.id }}>
													<Button variant="outline" size="sm">
														{t("admin.billing.manage", { defaultValue: "Manage" })}
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}
			</div>
		);
	},
	() => true,
);
BillingIndex.displayName = "BillingIndex";

export const Route = createFileRoute("/admin/billing/")({
	component: BillingIndex,
});

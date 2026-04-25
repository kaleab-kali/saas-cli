import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMainDashboard } from "#features/reporting/api/reporting.hooks";
import { DownloadButtons } from "#features/reporting/components/DownloadButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports/dashboard/main")({ component: Page });

const fmt = (n: number | undefined) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);
const num = (n: number | undefined) => (n ?? 0).toLocaleString();
const pct = (n: number | undefined) => `${(n ?? 0).toFixed(1)}%`;

function Page() {
	const { t } = useTranslation();
	const { data } = useMainDashboard();
	const k = data?.kpis ?? {};
	const activities = data?.recentActivities ?? [];
	const events = data?.upcomingEvents ?? [];
	const payments = data?.recentPayments ?? [];
	const workOrders = data?.recentWorkOrders ?? [];
	const leaseEnds = data?.upcomingLeaseEnds ?? [];
	const _dash = t("reports.dashboardMain.dash");

	const kpiCards = [
		{ key: "buildings", value: num(k.buildings) },
		{ key: "totalUnits", value: num(k.totalUnits) },
		{ key: "occupied", value: num(k.occupiedUnits) },
		{ key: "vacant", value: num(k.vacantUnits) },
		{ key: "occupancy", value: pct(k.occupancyRate) },
		{ key: "activeLeases", value: num(k.activeLeases) },
		{ key: "expiring30d", value: num(k.expiringLeases) },
		{ key: "openWos", value: num(k.openWorkOrders) },
		{ key: "overdueWos", value: num(k.overdueWorkOrders) },
		{ key: "completedWosMtd", value: num(k.completedWorkOrdersMtd) },
		{ key: "openDeals", value: num(k.openDeals) },
		{ key: "wonMtd", value: num(k.wonDealsMtd) },
		{ key: "lostMtd", value: num(k.lostDealsMtd) },
		{ key: "newLeadsMtd", value: num(k.newLeadsMtd) },
		{ key: "mtdRevenue", value: fmt(k.mtdRevenue) },
		{ key: "prevMonthRev", value: fmt(k.prevMonthRevenue) },
		{ key: "momPct", value: pct(k.revenueMoMPct) },
		{ key: "ytdRevenue", value: fmt(k.ytdRevenue) },
		{ key: "yoyPct", value: pct(k.revenueYoYPct) },
		{ key: "outstandingAr", value: fmt(k.outstandingAR) },
		{ key: "openInvoices", value: num(k.openInvoices) },
		{ key: "overdueInvoices", value: num(k.overdueInvoices) },
		{ key: "activities7d", value: num(k.activitiesThisWeek) },
		{ key: "inspections7d", value: num(k.inspectionsDue7d) },
	] as const;

	return (
		<div className="p-6 space-y-4 max-w-7xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h1 className="text-2xl font-bold">{t("reports.main")}</h1>
				<DownloadButtons kind="main" />
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
				{kpiCards.map((c) => (
					<Card key={c.key}>
						<CardHeader className="pb-1 pt-2 px-3">
							<CardTitle className="text-[10px] text-muted-foreground font-normal uppercase tracking-wide">
								{t(`reports.dashboardMain.kpis.${c.key}`)}
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0 pb-2 px-3">
							<div className="text-lg font-bold">{c.value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("reports.dashboardMain.recentActivities")}</CardTitle>
					</CardHeader>
					<CardContent>
						{activities.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("reports.dashboardMain.noActivities")}</p>
						) : (
							<ul className="space-y-2">
								{activities.map((a) => (
									<li key={a.id} className="text-sm border-b pb-1">
										<div className="font-medium">
											{a.type}
											{a.contact ? ` · ${a.contact}` : ""}
										</div>
										<div className="text-xs text-muted-foreground">
											{a.description ?? ""} — {new Date(a.createdAt).toLocaleString()}
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("reports.dashboardMain.upcomingViewings")}</CardTitle>
					</CardHeader>
					<CardContent>
						{events.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("reports.dashboardMain.noEvents")}</p>
						) : (
							<ul className="space-y-2">
								{events.map((e) => (
									<li key={e.id} className="text-sm border-b pb-1">
										<div className="font-medium">{e.title}</div>
										<div className="text-xs text-muted-foreground">
											{e.kind} — {new Date(e.at).toLocaleString()}
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("reports.dashboardMain.recentPayments")}</CardTitle>
					</CardHeader>
					<CardContent>
						{payments.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("reports.dashboardMain.noPayments")}</p>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="py-1">{t("reports.dashboardMain.columns.amount")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.method")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.date")}</th>
									</tr>
								</thead>
								<tbody>
									{payments.map((p) => (
										<tr key={p.id} className="border-b">
											<td className="py-1">{fmt(p.amount)}</td>
											<td className="py-1">{p.method}</td>
											<td className="py-1 text-xs">{new Date(p.paymentDate).toLocaleDateString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("reports.dashboardMain.recentWos")}</CardTitle>
					</CardHeader>
					<CardContent>
						{workOrders.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("reports.dashboardMain.noWos")}</p>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="py-1">{t("reports.dashboardMain.columns.title")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.status")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.priority")}</th>
									</tr>
								</thead>
								<tbody>
									{workOrders.map((w) => (
										<tr key={w.id} className="border-b">
											<td className="py-1 truncate max-w-[200px]">{w.title}</td>
											<td className="py-1">{w.status}</td>
											<td className="py-1">{w.priority}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle className="text-sm">{t("reports.dashboardMain.leaseEnds30d")}</CardTitle>
					</CardHeader>
					<CardContent>
						{leaseEnds.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("reports.dashboardMain.noLeaseEnds")}</p>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left border-b">
										<th className="py-1">{t("reports.dashboardMain.columns.unit")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.endDate")}</th>
										<th className="py-1">{t("reports.dashboardMain.columns.rent")}</th>
									</tr>
								</thead>
								<tbody>
									{leaseEnds.map((l) => (
										<tr key={l.id} className="border-b">
											<td className="py-1">{l.unit}</td>
											<td className="py-1">{new Date(l.endDate).toLocaleDateString()}</td>
											<td className="py-1">{fmt(l.rentAmount)}</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

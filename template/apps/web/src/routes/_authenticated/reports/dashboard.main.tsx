import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMainDashboard } from "#features/reporting/api/reporting.hooks";
import { DownloadButtons } from "#features/reporting/components/DownloadButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports/dashboard/main")({ component: Page });

const num = (n: number | undefined) => (n ?? 0).toLocaleString();

function Page() {
	const { t } = useTranslation();
	const { data } = useMainDashboard();
	const k = (data?.kpis as Record<string, number | undefined> | undefined) ?? {};

	const kpiCards = [
		{ key: "memberCount", label: t("reports.kpi.members", { defaultValue: "Active members" }), value: num(k.memberCount) },
		{
			key: "notificationCount",
			label: t("reports.kpi.notifications", { defaultValue: "Notifications" }),
			value: num(k.notificationCount),
		},
	];

	return (
		<div className="p-6 space-y-4 max-w-7xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h1 className="text-2xl font-bold">{t("reports.main", { defaultValue: "Main Dashboard" })}</h1>
				<DownloadButtons kind="main" />
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
				{kpiCards.map((c) => (
					<Card key={c.key}>
						<CardHeader className="pb-1 pt-2 px-3">
							<CardTitle className="text-[10px] text-muted-foreground font-normal uppercase tracking-wide">
								{c.label}
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0 pb-2 px-3">
							<div className="text-lg font-bold">{c.value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{t("reports.welcomeTitle", { defaultValue: "Welcome to your workspace" })}
					</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-2">
					<p>
						{t("reports.welcomeBody", {
							defaultValue:
								"This is your starter dashboard. Build your domain modules, then plug their KPIs into this page.",
						})}
					</p>
					<p>
						{t("reports.welcomeDocs", {
							defaultValue: "See docs/ADDING_DOMAIN.md to scaffold your first feature module.",
						})}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

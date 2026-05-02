import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports/")({ component: Page });

function Page() {
	const { t } = useTranslation();
	const links = [
		{ to: "/reports/dashboard/main", key: "dashboardMain" },
		{ to: "/reports/dashboard/property", key: "dashboardProperty" },
		{ to: "/reports/dashboard/financial", key: "dashboardFinancial" },
		{ to: "/reports/dashboard/crm", key: "dashboardCrm" },
		{ to: "/reports/dashboard/maintenance", key: "dashboardMaintenance" },
		{ to: "/reports/saved", key: "saved" },
		{ to: "/reports/new", key: "new" },
		{ to: "/reports/schedules", key: "schedules" },
	] as const;
	return (
		<div className="p-6 space-y-4 max-w-6xl">
			<h1 className="text-2xl font-bold">{t("reports.title")}</h1>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{links.map((l) => (
					<Link key={l.to} to={l.to}>
						<Card className="hover:bg-muted/50 transition h-full">
							<CardHeader>
								<CardTitle className="text-base">{t(`reports.indexPage.links.${l.key}.title`)}</CardTitle>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">
								{t(`reports.indexPage.links.${l.key}.desc`)}
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}

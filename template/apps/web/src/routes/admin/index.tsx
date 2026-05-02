import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { OrgTable } from "#features/admin/components/OrgTable";
import { PlatformStatsCards } from "#features/admin/components/PlatformStatsCards";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { t } = useTranslation();
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.platformOverview")}</h1>
				<p className="text-muted-foreground mt-1">{t("admin.platformOverviewDesc")}</p>
			</div>

			<PlatformStatsCards />

			<div>
				<h2 className="text-lg font-medium mb-4">{t("admin.recentOrganizations")}</h2>
				<OrgTable />
			</div>
		</div>
	);
}

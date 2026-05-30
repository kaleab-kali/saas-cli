import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { OrgTable } from "#features/admin/components/OrgTable";
import { PlatformStatsCards } from "#features/admin/components/PlatformStatsCards";
import { MetricCard, PageHeader } from "#shared/components/PageShell";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { t } = useTranslation();
	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Platform operations"
				title={t("admin.platformOverview")}
				description={t("admin.platformOverviewDesc")}
			/>

			<section className="rounded-lg border border-[#1e241a] bg-[#11130f] p-5 text-white">
				<div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
					<div className="space-y-2">
						<p className="text-xs font-medium uppercase text-primary">Staff command center</p>
						<h2 className="text-2xl font-semibold tracking-normal">Run tenant launch operations from one queue.</h2>
						<p className="max-w-2xl text-sm leading-6 text-white/65">
							Concierge onboarding, billing, feature flags, jobs, and audit trails are now first-class admin surfaces in
							the generated template.
						</p>
					</div>
					<div className="grid gap-3 sm:grid-cols-3">
						<MetricCard label="Mode" value="Concierge" className="border-white/10 bg-white/[0.05] text-white" />
						<MetricCard label="Queue" value="Tracked" className="border-white/10 bg-white/[0.05] text-white" />
						<MetricCard label="Audit" value="Ready" className="border-white/10 bg-white/[0.05] text-white" />
					</div>
				</div>
			</section>

			<PlatformStatsCards />

			<div>
				<h2 className="text-lg font-medium mb-4">{t("admin.recentOrganizations")}</h2>
				<OrgTable />
			</div>
		</div>
	);
}

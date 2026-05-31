import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { OrgTable } from "#features/admin/components/OrgTable";

export const Route = createFileRoute("/admin/organizations/")({
	component: OrganizationsPage,
});

function OrganizationsPage() {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.allOrganizations")}</h1>
				<p className="text-muted-foreground mt-1">{t("admin.manageAllOrgs")}</p>
			</div>

			<OrgTable />
		</div>
	);
}

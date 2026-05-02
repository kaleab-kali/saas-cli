import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { OrgTable } from "#features/admin/components/OrgTable";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/organizations/")({
	component: OrganizationsPage,
});

function OrganizationsPage() {
	const { t } = useTranslation();
	const [search, setSearch] = React.useState("");

	const handleSearch = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.allOrganizations")}</h1>
				<p className="text-muted-foreground mt-1">{t("admin.manageAllOrgs")}</p>
			</div>

			<Input
				placeholder={t("admin.searchOrgsPlaceholder")}
				value={search}
				onChange={handleSearch}
				className="max-w-sm"
			/>

			<OrgTable search={search} />
		</div>
	);
}

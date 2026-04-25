import { Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const OrgTable = React.memo(
	({ search }: { readonly search?: string }) => {
		const { t } = useTranslation();
		const { data, isLoading } = useAdminOrgList({ search });

		if (isLoading) {
			return (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={`row-${i}`} className="h-12 w-full" />
					))}
				</div>
			);
		}

		const orgs = data?.data || [];

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("admin.orgHeader")}</TableHead>
						<TableHead>{t("admin.slugHeader")}</TableHead>
						<TableHead>{t("admin.ownerHeader")}</TableHead>
						<TableHead className="text-right">{t("admin.membersHeader")}</TableHead>
						<TableHead>{t("admin.createdHeader")}</TableHead>
						<TableHead className="text-right">{t("admin.actionsHeader")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{orgs.length === 0 && (
						<TableRow>
							<TableCell colSpan={6} className="text-center text-muted-foreground py-8">
								{t("admin.noOrgs")}
							</TableCell>
						</TableRow>
					)}
					{orgs.map((org) => (
						<TableRow key={org.id}>
							<TableCell className="font-medium">{org.name}</TableCell>
							<TableCell>
								<Badge variant="secondary">{org.slug || "-"}</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground">{org.ownerEmail || "-"}</TableCell>
							<TableCell className="text-right">{org.memberCount}</TableCell>
							<TableCell className="text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
							<TableCell className="text-right">
								<Link to="/admin/organizations/$orgId" params={{ orgId: org.id }}>
									<Button variant="outline" size="sm">
										{t("admin.viewBtn")}
									</Button>
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	},
	(prev, next) => prev.search === next.search,
);
OrgTable.displayName = "OrgTable";

import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSuspendOrg, useUnsuspendOrg } from "#features/admin/api/admin.mutations";
import { useAdminOrgDetail } from "#features/admin/api/admin.queries";
import { OrgEntitlementOverridesPanel } from "#features/admin/components/OrgEntitlementOverridesPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/organizations/$orgId")({
	component: OrgDetailPage,
});

function OrgDetailPage() {
	const { t } = useTranslation();
	const { orgId } = Route.useParams();
	const { data: org, isLoading } = useAdminOrgDetail(orgId);
	const suspendMutation = useSuspendOrg();
	const unsuspendMutation = useUnsuspendOrg();

	const handleSuspend = React.useCallback(() => {
		const reason = window.prompt(t("admin.suspendPrompt", { defaultValue: "Reason for suspension (required):" }));
		if (!reason?.trim()) return;
		if (window.confirm(t("admin.suspendConfirm"))) {
			suspendMutation.mutate({ orgId, reason: reason.trim() });
		}
	}, [orgId, suspendMutation, t]);

	const handleUnsuspend = React.useCallback(() => {
		if (window.confirm(t("admin.unsuspendConfirm", { defaultValue: "Unsuspend this organization?" }))) {
			unsuspendMutation.mutate({ orgId });
		}
	}, [orgId, unsuspendMutation, t]);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (!org) return <p className="text-muted-foreground">{t("admin.orgNotFound")}</p>;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link to="/admin/organizations" className="text-sm text-muted-foreground hover:underline">
						{t("admin.backToOrganizations")}
					</Link>
					<h1 className="text-2xl font-semibold mt-2">{org.name}</h1>
					<p className="text-muted-foreground">{org.slug || t("admin.noSlug")}</p>
				</div>
				<div className="flex gap-2">
					{org.suspendedAt ? (
						<Button variant="default" onClick={handleUnsuspend} disabled={unsuspendMutation.isPending}>
							{unsuspendMutation.isPending
								? t("admin.unsuspending", { defaultValue: "Unsuspending..." })
								: t("admin.unsuspendBtn", { defaultValue: "Unsuspend" })}
						</Button>
					) : (
						<Button variant="destructive" onClick={handleSuspend} disabled={suspendMutation.isPending}>
							{suspendMutation.isPending ? t("admin.suspending") : t("admin.suspendBtn")}
						</Button>
					)}
				</div>
			</div>

			{org.suspendedAt && (
				<Card className="border-destructive/50 bg-destructive/5">
					<CardContent className="py-4 space-y-1">
						<div className="font-semibold text-destructive">
							{t("admin.orgSuspendedBanner", {
								defaultValue: "Organization suspended on {{date}}",
								date: new Date(org.suspendedAt).toLocaleString(),
							})}
						</div>
						{org.suspendReason && (
							<div className="text-sm">
								{t("admin.suspendReason", { defaultValue: "Reason" })}: {org.suspendReason}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">{t("admin.membersStat")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.memberCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">{t("admin.pendingInvitations")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.invitationCount}</p>
					</CardContent>
				</Card>
			</div>

			<div>
				<h2 className="text-lg font-medium mb-3">{t("admin.membersHeading")}</h2>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("admin.nameCol")}</TableHead>
							<TableHead>{t("admin.emailCol")}</TableHead>
							<TableHead>{t("admin.roleCol")}</TableHead>
							<TableHead>{t("admin.joinedCol")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{org.members.map((member) => (
							<TableRow key={member.id}>
								<TableCell className="font-medium">{member.user.name}</TableCell>
								<TableCell>{member.user.email}</TableCell>
								<TableCell>
									<Badge variant="secondary">{member.role}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{new Date(member.createdAt).toLocaleDateString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<OrgEntitlementOverridesPanel organizationId={orgId} />
		</div>
	);
}

import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSuspendOrg, useUnsuspendOrg } from "#features/admin/api/admin.mutations";
import { useAdminOrgDetail } from "#features/admin/api/admin.queries";
import { OrgEntitlementOverridesPanel } from "#features/admin/components/OrgEntitlementOverridesPanel";
import type { OrgMember } from "#features/admin/types/admin.types";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/organizations/$orgId")({
	component: OrgDetailPage,
});

const memberDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const memberColumns: ColumnDef<OrgMember, unknown>[] = [
	{
		id: "name",
		accessorFn: (member) => member.user.name,
		header: "Name",
		cell: ({ row }) => <span className="font-medium">{row.original.user.name}</span>,
		meta: { filter: { type: "text" } },
	},
	{
		id: "email",
		accessorFn: (member) => member.user.email,
		header: "Email",
		cell: ({ row }) => <span className="text-muted-foreground">{row.original.user.email}</span>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "role",
		header: "Role",
		cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
		meta: { filter: { type: "text" } },
	},
	{
		accessorKey: "createdAt",
		header: "Joined",
		cell: ({ row }) => (
			<span className="text-muted-foreground">{memberDateFormatter.format(new Date(row.original.createdAt))}</span>
		),
	},
];

function OrgMembersTable({
	members,
	organizationId,
}: {
	readonly members: readonly OrgMember[];
	readonly organizationId: string;
}) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base" role="heading" aria-level={2}>
					{t("admin.membersHeading")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={memberColumns}
					data={members}
					searchPlaceholder="Search members..."
					emptyTitle="No members"
					emptyMessage="This organization does not have any members yet."
					enableCsvExport
					exportFilename={`organization-${organizationId}-members.csv`}
					savedViewsEntity={`admin-organization-${organizationId}-members`}
					getRowId={(member) => member.id}
					pageSize={10}
				/>
			</CardContent>
		</Card>
	);
}

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

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">API keys</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.apiKeyCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Reports</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.savedReportCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Notifications</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.notificationCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Audit events</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{org.stats.auditLogCount}</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Subscription</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{org.subscription ? (
							<>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Plan</span>
									<span>{org.subscription.plan.nameEn}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Status</span>
									<Badge>{org.subscription.status.replace("_", " ")}</Badge>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Renews</span>
									<span>{new Date(org.subscription.currentPeriodEnd).toLocaleDateString()}</span>
								</div>
								<Link
									to="/admin/billing/$subscriptionId"
									params={{ subscriptionId: org.subscription.id }}
									className="text-sm text-primary hover:underline"
								>
									Manage billing
								</Link>
							</>
						) : (
							<p className="text-muted-foreground">No subscription found.</p>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Latest usage</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{org.usage ? (
							<>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Users</span>
									<span className="font-mono">{org.usage.userCount}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">API calls</span>
									<span className="font-mono">{org.usage.apiCallCount}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Emails</span>
									<span className="font-mono">{org.usage.emailCount}</span>
								</div>
							</>
						) : (
							<p className="text-muted-foreground">No usage snapshot yet.</p>
						)}
					</CardContent>
				</Card>
			</div>

			<OrgMembersTable members={org.members} organizationId={orgId} />

			<OrgEntitlementOverridesPanel organizationId={orgId} />
		</div>
	);
}

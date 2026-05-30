import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminPlans, useArchivePlan } from "#features/admin/api/admin-plans.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PlansIndex = React.memo(
	() => {
		const { t } = useTranslation();
		const [includeInactive, setIncludeInactive] = React.useState(false);
		const { data: plans = [], isLoading } = useAdminPlans(includeInactive);
		const archive = useArchivePlan();
		const fmt = React.useCallback((n: number) => new Intl.NumberFormat("en-US").format(n), []);

		const handleArchive = React.useCallback(
			(id: string, name: string) => {
				if (!window.confirm(t("admin.plans.archiveConfirm", { name, defaultValue: `Archive plan '${name}'?` }))) return;
				archive.mutate(id);
			},
			[archive, t],
		);

		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h1 className="text-2xl font-semibold">{t("admin.plans.title", { defaultValue: "Subscription Plans" })}</h1>
						<p className="text-sm text-muted-foreground">
							{t("admin.plans.subtitle", {
								defaultValue: "Manage plan catalog, prices, user limits, and feature entitlements.",
							})}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={includeInactive}
								onChange={(e) => setIncludeInactive(e.target.checked)}
								className="h-4 w-4"
							/>
							{t("admin.plans.showArchived", { defaultValue: "Show archived" })}
						</label>
						<Link to="/admin/plans/new">
							<Button size="sm">{t("admin.plans.newPlan", { defaultValue: "New Plan" })}</Button>
						</Link>
					</div>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Skeleton className="h-64" />
						<Skeleton className="h-64" />
						<Skeleton className="h-64" />
					</div>
				) : plans.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center text-muted-foreground">
							{t("admin.plans.empty", { defaultValue: "No plans yet." })}
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{plans.map((plan) => {
							const enabledCount = plan.entitlements.filter((e) => e.enabled).length;
							return (
								<Card key={plan.id} className={plan.active ? "" : "opacity-60"}>
									<CardHeader className="flex flex-row items-start justify-between space-y-0">
										<div>
											<CardTitle className="text-base flex items-center gap-2">
												{plan.nameEn}
												{!plan.active && (
													<Badge variant="secondary" className="text-[10px]">
														{t("admin.plans.archived", { defaultValue: "Archived" })}
													</Badge>
												)}
											</CardTitle>
											<p className="text-xs text-muted-foreground mt-1">{plan.nameAm}</p>
										</div>
										<code className="text-xs text-muted-foreground">{plan.slug}</code>
									</CardHeader>
									<CardContent className="space-y-3 text-sm">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<div className="text-xs text-muted-foreground">
													{t("admin.plans.monthly", { defaultValue: "Monthly" })}
												</div>
												<div className="font-mono">
													{fmt(plan.priceMonthlyMinor)} {plan.currency}
												</div>
											</div>
											<div>
												<div className="text-xs text-muted-foreground">
													{t("admin.plans.annual", { defaultValue: "Annual" })}
												</div>
												<div className="font-mono">
													{fmt(plan.priceAnnualMinor)} {plan.currency}
												</div>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2 text-xs">
											<div>
												<div className="text-muted-foreground">{t("admin.plans.users", { defaultValue: "Users" })}</div>
												<div>{plan.userCap ?? "unlimited"}</div>
											</div>
											<div>
												<div className="text-muted-foreground">
													{t("admin.plans.slaHours", { defaultValue: "SLA Hours" })}
												</div>
												<div>{plan.supportSlaHours}</div>
											</div>
										</div>
										<div className="text-xs text-muted-foreground">
											{t("admin.plans.entitlementsCount", {
												defaultValue: "{{count}} of {{total}} features enabled",
												count: enabledCount,
												total: plan.entitlements.length,
											})}
										</div>
										<div className="flex gap-2 pt-2">
											<Link to="/admin/plans/$planId" params={{ planId: plan.id }} className="flex-1">
												<Button variant="outline" size="sm" className="w-full">
													{t("admin.plans.edit", { defaultValue: "Edit" })}
												</Button>
											</Link>
											{plan.active && (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() => handleArchive(plan.id, plan.nameEn)}
													disabled={archive.isPending}
												>
													{t("admin.plans.archive", { defaultValue: "Archive" })}
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		);
	},
	() => true,
);
PlansIndex.displayName = "PlansIndex";

export const Route = createFileRoute("/admin/plans/")({
	component: PlansIndex,
});

import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminStats } from "#features/admin/api/admin.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
	readonly title: string;
	readonly value: number;
	readonly subtitle?: string;
}

const StatCard = React.memo(
	({ title, value, subtitle }: StatCardProps) => (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold">{value.toLocaleString()}</p>
				{subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
			</CardContent>
		</Card>
	),
	(prev, next) => prev.value === next.value && prev.title === next.title,
);
StatCard.displayName = "StatCard";

export const PlatformStatsCards = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: stats, isLoading } = useAdminStats();

		if (isLoading) {
			return (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`skeleton-${i}`}>
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
			);
		}

		if (!stats) return null;

		return (
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				<StatCard title={t("admin.statOrganizations")} value={stats.totalOrganizations} />
				<StatCard title={t("admin.statUsers")} value={stats.totalUsers} />
				<StatCard title={t("admin.statNewOrgs7d")} value={stats.newOrgsLast7Days} />
				<StatCard title={t("admin.statNewUsers7d")} value={stats.newUsersLast7Days} />
				<StatCard title={t("admin.statActiveSessions24h")} value={stats.activeSessionsLast24h} />
			</div>
		);
	},
	() => true,
);
PlatformStatsCards.displayName = "PlatformStatsCards";

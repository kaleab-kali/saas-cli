import React from "react";
import { useTranslation } from "react-i18next";
import { useUsage } from "#features/billing/api/billing.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Bar = React.memo(
	({
		label,
		used,
		cap,
		pct,
	}: {
		readonly label: string;
		readonly used: number;
		readonly cap: number | null;
		readonly pct: number;
	}) => {
		const isAtLimit = cap !== null && used >= cap;
		const isWarn = pct >= 80 && !isAtLimit;
		const color = isAtLimit ? "bg-destructive" : isWarn ? "bg-yellow-500" : "bg-primary";
		return (
			<div className="space-y-1">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">{label}</span>
					<span className={`font-mono ${isAtLimit ? "text-destructive font-semibold" : ""}`}>
						{used} / {cap ?? "unlimited"}
					</span>
				</div>
				<div className="h-2 rounded-full bg-muted overflow-hidden">
					<div className={`h-full ${color} transition-all`} style={{ width: cap ? `${Math.min(pct, 100)}%` : "10%" }} />
				</div>
			</div>
		);
	},
	(prev, next) =>
		prev.label === next.label && prev.used === next.used && prev.cap === next.cap && prev.pct === next.pct,
);
Bar.displayName = "UsageBar";

export const UsageWidget = React.memo(
	() => {
		const { t } = useTranslation();
		const { data } = useUsage();
		if (!data) return null;
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("billing.usageTitle", { defaultValue: "Plan usage" })}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Bar
						label={t("billing.usageUsers", { defaultValue: "Users" })}
						used={data.userCount}
						cap={data.caps.users}
						pct={data.usagePct.users}
					/>
					{Object.entries(data.metrics ?? {}).map(([key, value]) => (
						<Bar key={key} label={key} used={value} cap={null} pct={0} />
					))}
				</CardContent>
			</Card>
		);
	},
	() => true,
);
UsageWidget.displayName = "UsageWidget";

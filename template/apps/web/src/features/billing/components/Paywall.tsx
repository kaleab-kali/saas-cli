import { Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntitlements } from "../api/billing.hooks";

interface Props {
	readonly featureKey: string;
	readonly title?: string;
	readonly children: React.ReactNode;
}

export const Paywall = React.memo(
	({ featureKey, title, children }: Props) => {
		const { t } = useTranslation();
		const { data: entitlements, isLoading } = useEntitlements();
		if (isLoading) return <>{children}</>;
		const e = entitlements?.[featureKey];
		if (e?.enabled) return <>{children}</>;
		return (
			<Card className="max-w-lg mx-auto my-6 border-dashed">
				<CardHeader>
					<CardTitle className="text-base">{title ?? t("paywall.upgradeRequired")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						<span className="font-mono text-xs">{featureKey}</span> {t("paywall.notOnPlan")}
					</p>
					<div className="flex gap-2">
						<Button asChild size="sm">
							<Link to="/settings/billing">{t("paywall.viewPlans")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	},
	(a, b) => a.featureKey === b.featureKey && a.title === b.title && a.children === b.children,
);
Paywall.displayName = "Paywall";

import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
	{ key: "members", to: "/settings/members" },
	{ key: "roles", to: "/settings/roles" },
	{ key: "billing", to: "/settings/billing" },
	{ key: "organization", to: "/settings/organization" },
	{ key: "security", to: "/settings/security" },
	{ key: "apiKeys", to: "/settings/api-keys" },
	{ key: "auditLog", to: "/settings/audit-log" },
	{ key: "lookups", to: "/settings/lookups" },
] as const;

const SettingsIndex = React.memo(
	() => {
		const { t } = useTranslation();
		return (
			<div className="space-y-6 p-6">
				<div>
					<h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
					<p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{SECTIONS.map((s) => (
						<Link key={s.to} to={s.to}>
							<Card className="hover:bg-accent/50 transition-colors cursor-pointer">
								<CardHeader>
									<CardTitle className="text-base">{t(`settings.sections.${s.key}.title`)}</CardTitle>
									<CardDescription>{t(`settings.sections.${s.key}.desc`)}</CardDescription>
								</CardHeader>
								<CardContent>
									<span className="text-sm text-primary">{t("common.view")} &rarr;</span>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			</div>
		);
	},
	() => true,
);
SettingsIndex.displayName = "SettingsIndex";

export const Route = createFileRoute("/_authenticated/settings/")({
	component: SettingsIndex,
});

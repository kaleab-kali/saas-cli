import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { FeatureGate } from "#features/capabilities/components/FeatureGate";
import { useApiKeys, useRevokeApiKey } from "#features/platform/api/platform.hooks";
import { ApiKeyCreateDialog } from "#features/platform/components/ApiKeyCreateDialog";
import { ApiKeyPlainKeyDialog } from "#features/platform/components/ApiKeyPlainKeyDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({ component: Page });

export function Page() {
	const { t } = useTranslation();
	const [includeRevoked, setIncludeRevoked] = React.useState(false);
	const { data: keys = [] } = useApiKeys(includeRevoked);
	const revoke = useRevokeApiKey();
	const [plain, setPlain] = React.useState<string | null>(null);
	const closePlainKeyDialog = React.useCallback(() => setPlain(null), []);

	return (
		<div className="p-6 space-y-4 max-w-5xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h1 className="text-2xl font-bold">{t("settings.apiKeys.title")}</h1>
				<div className="flex gap-2 items-center">
					<label className="text-sm flex items-center gap-2">
						<input type="checkbox" checked={includeRevoked} onChange={(e) => setIncludeRevoked(e.target.checked)} />
						{t("settings.apiKeysExt.showRevokedLabel")}
					</label>
					<FeatureGate
						featureKey="platform.api-keys"
						requireCapacity
						fallback={<Button disabled>{t("settings.apiKeys.newKey")}</Button>}
					>
						<ApiKeyCreateDialog onCreated={setPlain} />
					</FeatureGate>
				</div>
			</div>
			<Card>
				<CardContent className="p-0">
					{keys.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("settings.apiKeys.noKeys")}</p>
					) : (
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.nameCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.prefixCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.scopesCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.expiresCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.lastUsedCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.usageCol")}</TableHead>
									<TableHead className="py-2 px-3">RPM</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.statusCol")}</TableHead>
									<TableHead className="py-2 px-3"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{keys.map((k) => (
									<TableRow key={k.id} className="border-b">
										<TableCell className="py-2 px-3 font-medium">{k.name}</TableCell>
										<TableCell className="py-2 px-3 font-mono text-xs">{k.keyPrefix}...</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.scopes.join(", ")}</TableCell>
										<TableCell className="py-2 px-3 text-xs">
											{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : t("settings.apiKeysExt.neverUsed")}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">
											{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : t("settings.apiKeysExt.neverUsed")}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.usageCount}</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.rateLimit ?? "plan"}</TableCell>
										<TableCell className="py-2 px-3">
											<Badge variant={k.revokedAt ? "secondary" : "default"}>
												{k.revokedAt ? t("settings.apiKeysExt.revokedStatus") : t("settings.apiKeysExt.activeStatus")}
											</Badge>
										</TableCell>
										<TableCell className="py-2 px-3 text-right">
											{!k.revokedAt && (
												<Button
													size="sm"
													variant="ghost"
													aria-label={`${t("settings.apiKeysExt.revokeBtn")} ${k.name}`}
													onClick={() => revoke.mutate(k.id)}
												>
													{t("settings.apiKeysExt.revokeBtn")}
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
			<ApiKeyPlainKeyDialog plain={plain} onClose={closePlainKeyDialog} />
		</div>
	);
}

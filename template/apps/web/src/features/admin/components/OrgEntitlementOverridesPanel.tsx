import React from "react";
import {
	useDeleteOverride,
	useOrgEntitlementOverrides,
	useUpsertOverride,
} from "#features/admin/api/admin-entitlement-overrides.hooks";
import { useAdminFeatureKeys } from "#features/admin/api/admin-plans.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const OrgEntitlementOverridesPanel = React.memo(
	({ organizationId }: { readonly organizationId: string }) => {
		const { data = [] } = useOrgEntitlementOverrides(organizationId);
		const { data: featureKeys = [] } = useAdminFeatureKeys();
		const upsert = useUpsertOverride();
		const del = useDeleteOverride();

		const [featureKey, setFeatureKey] = React.useState("");
		const [enabled, setEnabled] = React.useState(true);
		const [limit, setLimit] = React.useState("");
		const [expiresAt, setExpiresAt] = React.useState("");
		const [reason, setReason] = React.useState("");

		const handleGrant = React.useCallback(() => {
			if (!featureKey) return;
			upsert.mutate({
				organizationId,
				featureKey,
				enabled,
				limit: limit === "" ? null : Number(limit),
				expiresAt: expiresAt || null,
				reason: reason || undefined,
			});
			setFeatureKey("");
			setLimit("");
			setExpiresAt("");
			setReason("");
		}, [organizationId, featureKey, enabled, limit, expiresAt, reason, upsert]);

		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Feature entitlement overrides</CardTitle>
					<p className="text-xs text-muted-foreground">
						Grant or block individual features for this org independent of plan. Overrides take priority over plan +
						campaign.
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-[2fr_auto_auto_auto_2fr_auto] gap-2 items-end">
						<div className="space-y-1">
							<Label>Feature key</Label>
							<Select value={featureKey} onValueChange={setFeatureKey}>
								<SelectTrigger>
									<SelectValue placeholder="Pick feature" />
								</SelectTrigger>
								<SelectContent>
									{featureKeys.map((k) => (
										<SelectItem key={k} value={k}>
											{k}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Mode</Label>
							<Select value={enabled ? "on" : "off"} onValueChange={(v) => setEnabled(v === "on")}>
								<SelectTrigger className="w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="on">Grant</SelectItem>
									<SelectItem value="off">Block</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Limit</Label>
							<Input
								type="number"
								value={limit}
								onChange={(e) => setLimit(e.target.value)}
								placeholder="∞"
								className="w-24"
							/>
						</div>
						<div className="space-y-1">
							<Label>Expires</Label>
							<Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-40" />
						</div>
						<div className="space-y-1">
							<Label>Reason</Label>
							<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. beta access" />
						</div>
						<Button onClick={handleGrant} disabled={!featureKey || upsert.isPending}>
							{upsert.isPending ? "..." : "Apply"}
						</Button>
					</div>

					{data.length === 0 ? (
						<p className="text-sm text-muted-foreground py-4 text-center">No overrides active.</p>
					) : (
						<table className="w-full text-sm">
							<thead className="bg-muted/40">
								<tr>
									<th className="text-left p-2">Feature</th>
									<th className="text-left p-2">Mode</th>
									<th className="text-right p-2">Limit</th>
									<th className="text-left p-2">Expires</th>
									<th className="text-left p-2">Reason</th>
									<th className="text-right p-2" />
								</tr>
							</thead>
							<tbody>
								{data.map((o) => (
									<tr key={o.id} className="border-t">
										<td className="p-2 font-mono text-xs">{o.featureKey}</td>
										<td className="p-2">
											<Badge variant={o.enabled ? "default" : "destructive"}>{o.enabled ? "Grant" : "Block"}</Badge>
										</td>
										<td className="p-2 text-right font-mono">{o.limit ?? "∞"}</td>
										<td className="p-2">{o.expiresAt ? new Date(o.expiresAt).toLocaleDateString() : "—"}</td>
										<td className="p-2 text-muted-foreground">{o.reason || "—"}</td>
										<td className="p-2 text-right">
											<Button variant="ghost" size="sm" onClick={() => del.mutate(o.id)} disabled={del.isPending}>
												Remove
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		);
	},
	(prev, next) => prev.organizationId === next.organizationId,
);
OrgEntitlementOverridesPanel.displayName = "OrgEntitlementOverridesPanel";

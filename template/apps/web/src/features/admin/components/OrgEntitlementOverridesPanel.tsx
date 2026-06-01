import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type EntitlementOverride,
	useDeleteOverride,
	useOrgEntitlementOverrides,
	useUpsertOverride,
} from "#features/admin/api/admin-entitlement-overrides.hooks";
import { useAdminFeatureKeys } from "#features/admin/api/admin-plans.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const overrideDateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

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
		const featureKeyId = "org-entitlement-feature-key";
		const modeId = "org-entitlement-mode";
		const limitId = "org-entitlement-limit";
		const expiresAtId = "org-entitlement-expires-at";
		const reasonId = "org-entitlement-reason";

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

		const columns = React.useMemo<ColumnDef<EntitlementOverride, unknown>[]>(
			() => [
				{
					accessorKey: "featureKey",
					header: "Feature",
					cell: ({ row }) => <span className="font-mono text-xs">{row.original.featureKey}</span>,
					meta: { filter: { type: "text" } },
				},
				{
					id: "mode",
					accessorFn: (row) => (row.enabled ? "Grant" : "Block"),
					header: "Mode",
					cell: ({ row }) => (
						<Badge variant={row.original.enabled ? "default" : "destructive"}>
							{row.original.enabled ? "Grant" : "Block"}
						</Badge>
					),
					meta: {
						filter: {
							type: "select",
							options: [
								{ value: "Grant", label: "Grant" },
								{ value: "Block", label: "Block" },
							],
						},
					},
				},
				{
					accessorKey: "limit",
					header: "Limit",
					cell: ({ row }) => <span className="font-mono">{row.original.limit ?? "unlimited"}</span>,
					meta: { className: "text-right", headerClassName: "text-right" },
				},
				{
					accessorKey: "expiresAt",
					header: "Expires",
					cell: ({ row }) => (
						<span className="text-muted-foreground">
							{row.original.expiresAt ? overrideDateFormatter.format(new Date(row.original.expiresAt)) : "-"}
						</span>
					),
				},
				{
					accessorKey: "reason",
					header: "Reason",
					cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason || "-"}</span>,
					meta: { filter: { type: "text" } },
				},
				{
					id: "actions",
					header: "",
					enableSorting: false,
					enableColumnFilter: false,
					cell: ({ row }) => (
						<Button
							variant="ghost"
							size="sm"
							aria-label={`Remove ${row.original.featureKey} override`}
							onClick={() => del.mutate(row.original.id)}
							disabled={del.isPending}
						>
							Remove
						</Button>
					),
					meta: { className: "text-right", headerClassName: "text-right" },
				},
			],
			[del],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base" role="heading" aria-level={2}>
						Feature entitlement overrides
					</CardTitle>
					<p className="text-xs text-muted-foreground">
						Grant or block individual features for this organization independent of plan. Overrides take priority over
						plan defaults.
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-[2fr_auto_auto_auto_2fr_auto] gap-2 items-end">
						<div className="space-y-1">
							<Label htmlFor={featureKeyId}>Feature key</Label>
							<Select value={featureKey} onValueChange={setFeatureKey}>
								<SelectTrigger id={featureKeyId} aria-label="Feature key">
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
							<Label htmlFor={modeId}>Mode</Label>
							<Select value={enabled ? "on" : "off"} onValueChange={(v) => setEnabled(v === "on")}>
								<SelectTrigger id={modeId} aria-label="Mode" className="w-28">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="on">Grant</SelectItem>
									<SelectItem value="off">Block</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label htmlFor={limitId}>Limit</Label>
							<Input
								id={limitId}
								type="number"
								value={limit}
								onChange={(e) => setLimit(e.target.value)}
								placeholder="unlimited"
								className="w-24"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={expiresAtId}>Expires</Label>
							<Input
								id={expiresAtId}
								type="date"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
								className="w-40"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={reasonId}>Reason</Label>
							<Input
								id={reasonId}
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="e.g. beta access"
							/>
						</div>
						<Button
							onClick={handleGrant}
							disabled={!featureKey || upsert.isPending}
							aria-label="Apply entitlement override"
						>
							{upsert.isPending ? "..." : "Apply"}
						</Button>
					</div>

					<DataTable
						columns={columns}
						data={data}
						searchPlaceholder="Search overrides..."
						emptyTitle="No overrides active"
						emptyMessage="This organization is currently using its plan defaults."
						enableCsvExport
						exportFilename={`organization-${organizationId}-feature-overrides.csv`}
						savedViewsEntity={`admin-organization-${organizationId}-feature-overrides`}
						getRowId={(override) => override.id}
						pageSize={10}
					/>
				</CardContent>
			</Card>
		);
	},
	(prev, next) => prev.organizationId === next.organizationId,
);
OrgEntitlementOverridesPanel.displayName = "OrgEntitlementOverridesPanel";

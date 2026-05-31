import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import {
	type FeatureFlagRow,
	useFeatureFlags,
	useToggleFlagForOrg,
	useToggleFlagGlobal,
} from "#features/admin/api/admin-flags.hooks";
import { DataTable, type DataTableBulkAction, useDataTableState } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type OrgNameMap = ReadonlyMap<string, string>;

function OrgOverrideDialog({ flagName, orgNameMap }: { readonly flagName: string; readonly orgNameMap: OrgNameMap }) {
	const [open, setOpen] = React.useState(false);
	const [orgId, setOrgId] = React.useState("");
	const [enabled, setEnabled] = React.useState(true);
	const { data: orgsData } = useAdminOrgList({ limit: 100 });
	const toggleForOrg = useToggleFlagForOrg();
	const orgs = orgsData?.data ?? [];
	const selectedOrgLabel = orgNameMap.get(orgId) ?? orgId;

	const submit = React.useCallback(async () => {
		if (!orgId) return;
		await toggleForOrg.mutateAsync({ name: flagName, orgId, enabled });
		setOpen(false);
	}, [orgId, enabled, toggleForOrg, flagName]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Add override
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Org override: {flagName}</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<Select value={orgId} onValueChange={setOrgId}>
						<SelectTrigger>
							<SelectValue placeholder="Pick organization" />
						</SelectTrigger>
						<SelectContent>
							{orgs.map((org) => (
								<SelectItem key={org.id} value={org.id}>
									{org.name} - {org.slug ?? org.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={enabled ? "on" : "off"} onValueChange={(value) => setEnabled(value === "on")}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="on">Enable</SelectItem>
							<SelectItem value="off">Disable</SelectItem>
						</SelectContent>
					</Select>
					{orgId && (
						<p className="text-xs text-muted-foreground">
							This override will {enabled ? "enable" : "disable"} {flagName} for {selectedOrgLabel}.
						</p>
					)}
				</div>
				<DialogFooter>
					<Button onClick={submit} disabled={!orgId || toggleForOrg.isPending}>
						{toggleForOrg.isPending ? "Saving..." : "Apply"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function GlobalFlagSwitch({ flag }: { readonly flag: FeatureFlagRow }) {
	const toggleGlobal = useToggleFlagGlobal();
	return (
		<div className="flex items-center gap-3">
			<Switch
				aria-label={`Toggle ${flag.name} globally`}
				checked={flag.enabledGlobal}
				disabled={toggleGlobal.isPending}
				onCheckedChange={(enabled) => toggleGlobal.mutate({ name: flag.name, enabled })}
			/>
			<Badge variant={flag.enabledGlobal ? "default" : "secondary"}>
				{flag.enabledGlobal ? "Enabled" : "Disabled"}
			</Badge>
		</div>
	);
}

function OverrideList({ flag, orgNameMap }: { readonly flag: FeatureFlagRow; readonly orgNameMap: OrgNameMap }) {
	const toggleForOrg = useToggleFlagForOrg();
	if (flag.overrides.length === 0) {
		return <span className="text-xs text-muted-foreground">No org overrides</span>;
	}

	return (
		<div className="flex max-w-md flex-col gap-2">
			{flag.overrides.slice(0, 3).map((override) => (
				<div key={override.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
					<div className="min-w-0">
						<div className="truncate text-sm font-medium">
							{orgNameMap.get(override.organizationId) ?? override.organizationId}
						</div>
						<code className="block truncate text-[10px] text-muted-foreground">{override.organizationId}</code>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={override.enabled ? "default" : "secondary"}>
							{override.enabled ? "Enabled" : "Disabled"}
						</Badge>
						<Switch
							aria-label={`Toggle ${flag.name} for ${orgNameMap.get(override.organizationId) ?? override.organizationId}`}
							size="sm"
							checked={override.enabled}
							disabled={toggleForOrg.isPending}
							onCheckedChange={(enabled) =>
								toggleForOrg.mutate({ name: flag.name, orgId: override.organizationId, enabled })
							}
						/>
					</div>
				</div>
			))}
			{flag.overrides.length > 3 && (
				<span className="text-xs text-muted-foreground">+{flag.overrides.length - 3} more override(s)</span>
			)}
		</div>
	);
}

function buildFlagColumns(orgNameMap: OrgNameMap): ColumnDef<FeatureFlagRow, unknown>[] {
	return [
		{
			accessorKey: "name",
			header: "Flag",
			cell: ({ row }) => (
				<div className="min-w-56 space-y-1">
					<div className="font-mono text-sm font-medium">{row.original.name}</div>
					<p className="max-w-xl text-xs text-muted-foreground">{row.original.description || "No description"}</p>
				</div>
			),
			meta: { filter: { type: "text" } },
		},
		{
			accessorKey: "enabledGlobal",
			header: "Global",
			cell: ({ row }) => <GlobalFlagSwitch flag={row.original} />,
			meta: { filter: { type: "boolean" } },
		},
		{
			id: "overrides",
			accessorFn: (flag) => flag.overrides.length,
			header: "Overrides",
			cell: ({ row }) => (
				<div className="space-y-2">
					<div className="text-xs text-muted-foreground">
						{row.original.overrides.length} override{row.original.overrides.length === 1 ? "" : "s"}
					</div>
					<OverrideList flag={row.original} orgNameMap={orgNameMap} />
				</div>
			),
			meta: { filter: { type: "number-range" } },
		},
		{
			id: "enabledOverrides",
			accessorFn: (flag) => flag.overrides.filter((override) => override.enabled).length,
			header: "Enabled overrides",
			cell: ({ row }) => `${row.original.overrides.filter((override) => override.enabled).length}`,
			meta: { filter: { type: "number-range" } },
		},
		{
			id: "actions",
			header: "Actions",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => <OrgOverrideDialog flagName={row.original.name} orgNameMap={orgNameMap} />,
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

const FeatureFlagsPage = React.memo(() => {
	const { data: flags = [], isLoading, error, refetch } = useFeatureFlags();
	const { data: orgsData } = useAdminOrgList({ limit: 200 });
	const toggleGlobal = useToggleFlagGlobal();
	const tableState = useDataTableState({ defaultPageSize: 20, defaultSort: [{ id: "name", desc: false }] });
	const orgNameMap = React.useMemo<OrgNameMap>(
		() => new Map((orgsData?.data ?? []).map((org) => [org.id, org.name] as const)),
		[orgsData],
	);
	const columns = React.useMemo(() => buildFlagColumns(orgNameMap), [orgNameMap]);
	const bulkActions = React.useMemo<readonly DataTableBulkAction<FeatureFlagRow>[]>(
		() => [
			{
				id: "enable-global",
				label: "Enable globally",
				onSelect: async (rows) => {
					await Promise.all(rows.map((flag) => toggleGlobal.mutateAsync({ name: flag.name, enabled: true })));
				},
			},
			{
				id: "disable-global",
				label: "Disable globally",
				variant: "destructive",
				onSelect: async (rows) => {
					await Promise.all(rows.map((flag) => toggleGlobal.mutateAsync({ name: flag.name, enabled: false })));
				},
			},
		],
		[toggleGlobal],
	);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Feature Flags</h1>
				<p className="text-sm text-muted-foreground">
					Manage global rollout switches and organization-specific overrides from one auditable table.
				</p>
			</div>
			{isLoading ? (
				<Skeleton className="h-96 w-full" />
			) : (
				<Card>
					<CardContent className="pt-6">
						<DataTable
							columns={columns}
							data={flags}
							isLoading={isLoading}
							error={error}
							onRetry={() => void refetch()}
							searchPlaceholder="Search feature flags..."
							emptyTitle="No feature flags configured"
							emptyMessage="Seed feature flags to manage global rollout and per-organization access."
							enableCsvExport
							enableRowSelection
							exportFilename="feature-flags.csv"
							savedViewsEntity="admin-feature-flags"
							bulkActions={bulkActions}
							getRowId={(flag) => flag.id}
							{...tableState.tableProps}
							manualPagination={false}
							manualSorting={false}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
});
FeatureFlagsPage.displayName = "FeatureFlagsPage";

export const Route = createFileRoute("/admin/feature-flags/")({
	component: FeatureFlagsPage,
});

import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import {
	type FeatureFlagRow,
	useFeatureFlags,
	useToggleFlagForOrg,
	useToggleFlagGlobal,
} from "#features/admin/api/admin-flags.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const OrgOverrideDialog = React.memo(
	({ flagName }: { readonly flagName: string }) => {
		const [open, setOpen] = React.useState(false);
		const [orgId, setOrgId] = React.useState("");
		const [enabled, setEnabled] = React.useState(true);
		const { data: orgsData } = useAdminOrgList({ limit: 100 });
		const toggleForOrg = useToggleFlagForOrg();
		const orgs = orgsData?.data ?? [];
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
								{orgs.map((o) => (
									<SelectItem key={o.id} value={o.id}>
										{o.name} — {o.slug ?? o.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={enabled ? "on" : "off"} onValueChange={(v) => setEnabled(v === "on")}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="on">Enable</SelectItem>
								<SelectItem value="off">Disable</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button onClick={submit} disabled={!orgId || toggleForOrg.isPending}>
							{toggleForOrg.isPending ? "Saving..." : "Apply"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
	(prev, next) => prev.flagName === next.flagName,
);
OrgOverrideDialog.displayName = "OrgOverrideDialog";

const FlagRow = React.memo(
	({ flag, orgNameMap }: { readonly flag: FeatureFlagRow; readonly orgNameMap: Map<string, string> }) => {
		const toggleGlobal = useToggleFlagGlobal();
		const toggleForOrg = useToggleFlagForOrg();
		return (
			<Card>
				<CardHeader className="flex flex-row items-start justify-between space-y-0">
					<div className="space-y-1">
						<CardTitle className="text-base font-mono">{flag.name}</CardTitle>
						{flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={flag.enabledGlobal ? "default" : "secondary"}>
							{flag.enabledGlobal ? "Enabled globally" : "Disabled globally"}
						</Badge>
						<Button
							size="sm"
							variant="outline"
							disabled={toggleGlobal.isPending}
							onClick={() => toggleGlobal.mutate({ name: flag.name, enabled: !flag.enabledGlobal })}
						>
							{toggleGlobal.isPending ? "..." : flag.enabledGlobal ? "Disable" : "Enable"}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex items-center justify-between">
						<div className="text-sm text-muted-foreground">{flag.overrides.length} org override(s)</div>
						<OrgOverrideDialog flagName={flag.name} />
					</div>
					{flag.overrides.length > 0 && (
						<ul className="divide-y rounded-md border text-sm">
							{flag.overrides.map((o) => (
								<li key={o.id} className="flex items-center justify-between p-2">
									<div>
										<div className="font-medium">{orgNameMap.get(o.organizationId) ?? o.organizationId}</div>
										<code className="text-[10px] text-muted-foreground">{o.organizationId}</code>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={o.enabled ? "default" : "secondary"}>{o.enabled ? "Enabled" : "Disabled"}</Badge>
										<Button
											size="sm"
											variant="ghost"
											onClick={() =>
												toggleForOrg.mutate({ name: flag.name, orgId: o.organizationId, enabled: !o.enabled })
											}
										>
											Flip
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		);
	},
	(prev, next) => prev.flag === next.flag && prev.orgNameMap === next.orgNameMap,
);
FlagRow.displayName = "FlagRow";

const FeatureFlagsPage = React.memo(
	() => {
		const { data: flags = [], isLoading } = useFeatureFlags();
		const { data: orgsData } = useAdminOrgList({ limit: 200 });
		const orgNameMap = React.useMemo(
			() => new Map((orgsData?.data ?? []).map((o) => [o.id, o.name] as const)),
			[orgsData],
		);
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Feature Flags</h1>
					<p className="text-sm text-muted-foreground">
						Global on/off switches + per-organization overrides. Takes effect immediately.
					</p>
				</div>
				{isLoading ? (
					<Skeleton className="h-96 w-full" />
				) : flags.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center text-muted-foreground">
							No feature flags configured. Seed them to see anything here.
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{flags.map((f) => (
							<FlagRow key={f.id} flag={f} orgNameMap={orgNameMap} />
						))}
					</div>
				)}
			</div>
		);
	},
	() => true,
);
FeatureFlagsPage.displayName = "FeatureFlagsPage";

export const Route = createFileRoute("/admin/feature-flags/")({
	component: FeatureFlagsPage,
});

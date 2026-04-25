import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type LookupItem,
	type LookupKind,
	useCreateLookup,
	useDeleteLookup,
	useLookups,
	useUpdateLookup,
} from "#shared/api/lookup.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings/lookups")({
	component: LookupsPage,
});

interface ModuleGroup {
	moduleKey: "CRM" | "Maintenance" | "Procurement" | "Sales";
	kinds: LookupKind[];
}

const MODULE_GROUPS: ModuleGroup[] = [
	{
		moduleKey: "CRM",
		kinds: ["contact_type", "contact_source", "comm_channel", "activity_type", "relationship_type"],
	},
	{
		moduleKey: "Maintenance",
		kinds: ["work_order_category", "work_order_priority", "pm_category", "asset_type", "vendor_specialty"],
	},
	{
		moduleKey: "Procurement",
		kinds: ["pr_category", "pr_urgency", "budget_category", "approver_role"],
	},
	{
		moduleKey: "Sales",
		kinds: [
			"listing_type",
			"listing_feature",
			"lead_source",
			"lead_temperature",
			"financing_status",
			"agent_specialty",
			"interest_level",
		],
	},
];

function LookupsPage() {
	const { t } = useTranslation();
	const [kind, setKind] = React.useState<LookupKind>("contact_type");
	const [includeArchived, setIncludeArchived] = React.useState(false);
	const { data: items = [], isLoading } = useLookups(kind, includeArchived);
	const createLookup = useCreateLookup(kind);
	const updateLookup = useUpdateLookup(kind);
	const deleteLookup = useDeleteLookup(kind);

	const [error, setError] = React.useState("");

	const handleCreate = React.useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setError("");
			const form = e.currentTarget;
			const fd = new FormData(form);
			const label = (fd.get("label") as string)?.trim();
			const value = (fd.get("value") as string)?.trim() || undefined;
			const description = (fd.get("description") as string)?.trim() || undefined;
			const color = (fd.get("color") as string)?.trim() || undefined;
			const sortOrder = fd.get("sortOrder") ? Number(fd.get("sortOrder")) : undefined;
			if (!label) {
				setError(t("settings.lookups.labelRequired"));
				return;
			}
			try {
				await createLookup.mutateAsync({ label, value, description, color, sortOrder });
				form.reset();
			} catch (err) {
				setError(err instanceof Error ? err.message : t("settings.lookups.createFailed"));
			}
		},
		[createLookup, t],
	);

	const handleArchiveToggle = React.useCallback(
		(item: LookupItem) => {
			updateLookup.mutate({ id: item.id, archived: !item.archived });
		},
		[updateLookup],
	);

	const handleDelete = React.useCallback(
		(id: string) => {
			if (!window.confirm(t("settings.lookups.deleteConfirm"))) return;
			deleteLookup.mutate(id, {
				onError: (err) => window.alert(err.message || t("settings.lookups.deleteFailed")),
			});
		},
		[deleteLookup, t],
	);

	const columns = React.useMemo<ColumnDef<LookupItem>[]>(
		() => [
			{
				accessorKey: "label",
				header: t("settings.lookups.labelHeader"),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						{row.original.color && (
							<span
								className="inline-block h-3 w-3 rounded-full border"
								style={{ backgroundColor: row.original.color }}
							/>
						)}
						<span className="font-medium">{row.original.label}</span>
						{row.original.isBuiltIn && (
							<Badge variant="outline" className="text-xs">
								{t("settings.lookups.defaultBadge")}
							</Badge>
						)}
						{row.original.archived && (
							<Badge variant="secondary" className="text-xs">
								{t("settings.lookups.archivedBadge")}
							</Badge>
						)}
					</div>
				),
			},
			{
				accessorKey: "value",
				header: t("settings.lookups.valueHeader"),
				cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.value}</code>,
			},
			{
				accessorKey: "description",
				header: t("settings.lookups.descriptionHeader"),
				cell: ({ row }) => row.original.description || "—",
			},
			{
				accessorKey: "sortOrder",
				header: () => <div className="text-right">{t("settings.lookups.orderHeader")}</div>,
				cell: ({ row }) => <div className="text-right">{row.original.sortOrder}</div>,
			},
			{
				id: "actions",
				header: () => <div className="text-right">{t("settings.lookups.actions")}</div>,
				enableSorting: false,
				cell: ({ row }) => (
					<div className="text-right flex justify-end gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => handleArchiveToggle(row.original)}
							disabled={updateLookup.isPending}
						>
							{row.original.archived ? t("settings.lookups.unarchive") : t("settings.lookups.archive")}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive"
							onClick={() => handleDelete(row.original.id)}
						>
							{t("common.delete")}
						</Button>
					</div>
				),
			},
		],
		[handleArchiveToggle, handleDelete, updateLookup.isPending, t],
	);

	return (
		<div className="space-y-6">
			<div>
				<Link to="/settings" className="text-sm text-muted-foreground hover:underline">
					&larr; {t("settings.lookups.back")}
				</Link>
				<h1 className="text-2xl font-semibold mt-2">{t("settings.sections.lookups.title")}</h1>
				<p className="text-muted-foreground mt-1">{t("settings.lookups.subtitle")}</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("settings.lookups.catalogs")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 p-4">
						{MODULE_GROUPS.map((g) => (
							<div key={g.moduleKey} className="space-y-1">
								<div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
									{t(`settings.lookups.modules.${g.moduleKey}.name`)}
								</div>
								<ul className="space-y-0.5">
									{g.kinds.map((k) => (
										<li key={k}>
											<button
												type="button"
												onClick={() => setKind(k)}
												className={`w-full text-left px-2 py-1.5 rounded text-sm ${
													kind === k ? "bg-accent font-medium" : "hover:bg-accent/50"
												}`}
											>
												{t(`settings.lookups.kinds.${k}.label`, { defaultValue: k })}
											</button>
										</li>
									))}
								</ul>
							</div>
						))}
					</CardContent>
				</Card>

				<div className="space-y-4">
					<div className="rounded-md border bg-muted/30 p-3">
						<div className="font-medium">{t(`settings.lookups.kinds.${kind}.label`, { defaultValue: kind })}</div>
						<p className="text-sm text-muted-foreground">
							{t(`settings.lookups.kinds.${kind}.desc`, { defaultValue: "" })}
						</p>
					</div>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">{t("settings.lookups.addValue")}</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleCreate} className="space-y-3">
								{error && <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
								<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
									<div className="space-y-1">
										<Label htmlFor="lk-label">{t("settings.lookups.labelStar")}</Label>
										<Input id="lk-label" name="label" placeholder={t("settings.lookups.labelPlaceholder")} required />
									</div>
									<div className="space-y-1">
										<Label htmlFor="lk-value">{t("settings.lookups.value")}</Label>
										<Input id="lk-value" name="value" placeholder={t("settings.lookups.valuePlaceholder")} />
									</div>
									<div className="space-y-1">
										<Label htmlFor="lk-sort">{t("settings.lookups.sortOrder")}</Label>
										<Input id="lk-sort" name="sortOrder" type="number" defaultValue="100" />
									</div>
									<div className="space-y-1">
										<Label htmlFor="lk-color">{t("settings.lookups.color")}</Label>
										<Input id="lk-color" name="color" type="color" className="h-10 p-1" />
									</div>
								</div>
								<div className="space-y-1">
									<Label htmlFor="lk-desc">{t("common.description")}</Label>
									<Input id="lk-desc" name="description" placeholder={t("settings.lookups.descriptionPlaceholder")} />
								</div>
								<Button type="submit" size="sm" disabled={createLookup.isPending}>
									{createLookup.isPending ? t("settings.lookups.adding") : t("settings.lookups.addValue")}
								</Button>
							</form>
						</CardContent>
					</Card>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">{t("settings.lookups.values")}</h2>
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<input
									type="checkbox"
									className="h-4 w-4"
									checked={includeArchived}
									onChange={(e) => setIncludeArchived(e.target.checked)}
								/>
								{t("settings.lookups.showArchived")}
							</label>
						</div>

						<DataTable
							columns={columns}
							data={items}
							isLoading={isLoading}
							searchPlaceholder={t("settings.lookups.searchPlaceholder")}
							emptyMessage={t("settings.lookups.emptyMessage")}
							pageSize={50}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	useAdminFeatureKeys,
	useAdminPlan,
	useBulkUpsertEntitlements,
	useUpdatePlan,
} from "#features/admin/api/admin-plans.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface EntitlementRow {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

const EMPTY_FEATURE_KEYS: readonly string[] = [];

function buildEntitlementColumns(
	t: (key: string, options?: { readonly defaultValue?: string }) => string,
	updateRow: (key: string, patch: Partial<EntitlementRow>) => void,
): ColumnDef<EntitlementRow, unknown>[] {
	return [
		{
			accessorKey: "featureKey",
			header: t("admin.plans.feature", { defaultValue: "Feature Key" }),
			cell: ({ row }) => <span className="font-mono text-xs">{row.original.featureKey}</span>,
			meta: { filter: { type: "text" } },
		},
		{
			id: "enabled",
			accessorFn: (row) => (row.enabled ? "enabled" : "disabled"),
			header: t("admin.plans.enabled", { defaultValue: "Enabled" }),
			cell: ({ row }) => (
				<Switch
					aria-label={`Toggle ${row.original.featureKey}`}
					checked={row.original.enabled}
					onCheckedChange={(checked) => updateRow(row.original.featureKey, { enabled: checked })}
				/>
			),
			meta: {
				className: "text-center",
				headerClassName: "text-center",
				filter: {
					type: "select",
					options: [
						{ value: "enabled", label: "Enabled" },
						{ value: "disabled", label: "Disabled" },
					],
				},
			},
		},
		{
			accessorKey: "limit",
			header: t("admin.plans.limit", { defaultValue: "Limit" }),
			cell: ({ row }) => (
				<Input
					type="number"
					value={row.original.limit ?? ""}
					onChange={(e) =>
						updateRow(row.original.featureKey, { limit: e.target.value === "" ? null : Number(e.target.value) })
					}
					disabled={!row.original.enabled}
					placeholder="unlimited"
					className="ml-auto w-28 text-right font-mono"
				/>
			),
			meta: { className: "text-right", headerClassName: "text-right" },
		},
	];
}

const PlanDetail = React.memo(
	() => {
		const { t } = useTranslation();
		const { planId } = Route.useParams();
		const { data: plan, isLoading } = useAdminPlan(planId);
		const { data: featureKeys = EMPTY_FEATURE_KEYS } = useAdminFeatureKeys();
		const updatePlan = useUpdatePlan();
		const bulkUpsert = useBulkUpsertEntitlements();

		const [rows, setRows] = React.useState<EntitlementRow[]>([]);
		const [form, setForm] = React.useState({
			nameEn: "",
			nameAm: "",
			description: "",
			priceMonthlyMinor: 0,
			priceAnnualMinor: 0,
			currency: "USD",
			userCap: "" as string | number,
			supportSlaHours: 48,
			sortOrder: 0,
			active: true,
		});

		React.useEffect(() => {
			if (!plan) return;
			setForm({
				nameEn: plan.nameEn,
				nameAm: plan.nameAm,
				description: plan.description ?? "",
				priceMonthlyMinor: plan.priceMonthlyMinor,
				priceAnnualMinor: plan.priceAnnualMinor,
				currency: plan.currency,
				userCap: plan.userCap ?? "",
				supportSlaHours: plan.supportSlaHours,
				sortOrder: plan.sortOrder,
				active: plan.active,
			});
			const byKey = new Map(plan.entitlements.map((e) => [e.featureKey, e] as const));
			const allRows = (featureKeys.length ? featureKeys : plan.entitlements.map((e) => e.featureKey))
				.slice()
				.sort()
				.map((featureKey) => {
					const existing = byKey.get(featureKey);
					return {
						featureKey,
						enabled: existing?.enabled ?? false,
						limit: existing?.limit ?? null,
					};
				});
			setRows(allRows);
		}, [plan, featureKeys]);

		const updateRow = React.useCallback(
			(key: string, patch: Partial<EntitlementRow>) =>
				setRows((prev) => prev.map((row) => (row.featureKey === key ? { ...row, ...patch } : row))),
			[],
		);
		const entitlementColumns = React.useMemo(() => buildEntitlementColumns(t, updateRow), [t, updateRow]);

		const handleSavePlan = React.useCallback(async () => {
			if (!plan) return;
			const userCap = form.userCap === "" ? null : Number(form.userCap);
			await updatePlan.mutateAsync({
				id: plan.id,
				nameEn: form.nameEn,
				nameAm: form.nameAm,
				description: form.description || null,
				priceMonthlyMinor: Number(form.priceMonthlyMinor),
				priceAnnualMinor: Number(form.priceAnnualMinor),
				currency: form.currency,
				userCap,
				supportSlaHours: Number(form.supportSlaHours),
				sortOrder: Number(form.sortOrder),
				active: form.active,
			});
		}, [plan, form, updatePlan]);

		const handleSaveEntitlements = React.useCallback(async () => {
			if (!plan) return;
			await bulkUpsert.mutateAsync({ planId: plan.id, entitlements: rows });
		}, [plan, rows, bulkUpsert]);

		if (isLoading || !plan) return <Skeleton className="h-96 w-full" />;

		return (
			<div className="space-y-6">
				<div>
					<Link to="/admin/plans" className="text-sm text-muted-foreground hover:underline">
						{"<-"} {t("admin.plans.backToPlans", { defaultValue: "Back to Plans" })}
					</Link>
					<h1 className="text-2xl font-semibold mt-2">
						{t("admin.plans.editTitle", { defaultValue: "Edit Plan: {{name}}", name: plan.nameEn })}
					</h1>
					<code className="text-xs text-muted-foreground">{plan.slug}</code>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("admin.plans.planDetails", { defaultValue: "Plan Details" })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label htmlFor="plan-name-en">{t("admin.plans.nameEn", { defaultValue: "Name (English)" })}</Label>
								<Input
									id="plan-name-en"
									value={form.nameEn}
									onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-name-am">{t("admin.plans.nameAm", { defaultValue: "Name (Amharic)" })}</Label>
								<Input
									id="plan-name-am"
									value={form.nameAm}
									onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label htmlFor="plan-description">{t("admin.plans.description", { defaultValue: "Description" })}</Label>
							<Input
								id="plan-description"
								value={form.description}
								onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label htmlFor="plan-monthly">
									{t("admin.plans.monthly", { defaultValue: "Monthly (minor units)" })}
								</Label>
								<Input
									id="plan-monthly"
									type="number"
									value={form.priceMonthlyMinor}
									onChange={(e) => setForm((f) => ({ ...f, priceMonthlyMinor: Number(e.target.value) }))}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-annual">{t("admin.plans.annual", { defaultValue: "Annual (minor units)" })}</Label>
								<Input
									id="plan-annual"
									type="number"
									value={form.priceAnnualMinor}
									onChange={(e) => setForm((f) => ({ ...f, priceAnnualMinor: Number(e.target.value) }))}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-currency">{t("admin.plans.currency", { defaultValue: "Currency" })}</Label>
								<Input
									id="plan-currency"
									value={form.currency}
									onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label htmlFor="plan-user-cap">{t("admin.plans.userCap", { defaultValue: "User Cap" })}</Label>
								<Input
									id="plan-user-cap"
									type="number"
									value={form.userCap}
									onChange={(e) => setForm((f) => ({ ...f, userCap: e.target.value }))}
									placeholder="unlimited"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-sla-hours">{t("admin.plans.slaHours", { defaultValue: "SLA Hours" })}</Label>
								<Input
									id="plan-sla-hours"
									type="number"
									value={form.supportSlaHours}
									onChange={(e) => setForm((f) => ({ ...f, supportSlaHours: Number(e.target.value) }))}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-sort-order">{t("admin.plans.sortOrder", { defaultValue: "Sort Order" })}</Label>
								<Input
									id="plan-sort-order"
									type="number"
									value={form.sortOrder}
									onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
								/>
							</div>
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={form.active}
								onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
							/>
							{t("admin.plans.active", { defaultValue: "Active" })}
						</label>
						<Button onClick={handleSavePlan} disabled={updatePlan.isPending}>
							{updatePlan.isPending ? t("common.saving") : t("admin.plans.savePlan", { defaultValue: "Save Plan" })}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle className="text-base" role="heading" aria-level={2}>
							{t("admin.plans.entitlements", { defaultValue: "Feature Entitlements" })}
						</CardTitle>
						<Button onClick={handleSaveEntitlements} disabled={bulkUpsert.isPending} size="sm">
							{bulkUpsert.isPending
								? t("common.saving")
								: t("admin.plans.saveEntitlements", { defaultValue: "Save Entitlements" })}
						</Button>
					</CardHeader>
					<CardContent>
						<DataTable
							columns={entitlementColumns}
							data={rows}
							searchPlaceholder="Search entitlements..."
							emptyTitle="No feature entitlements"
							emptyMessage="Add feature keys before configuring this plan."
							enableCsvExport
							exportFilename={`plan-${plan.slug}-entitlements.csv`}
							savedViewsEntity={`admin-plan-${plan.id}-entitlements`}
							getRowId={(row) => row.featureKey}
							pageSize={20}
						/>
					</CardContent>
				</Card>
			</div>
		);
	},
	() => true,
);
PlanDetail.displayName = "PlanDetail";

export const Route = createFileRoute("/admin/plans/$planId")({
	component: PlanDetail,
});

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	useAdminFeatureKeys,
	useAdminPlan,
	useBulkUpsertEntitlements,
	useUpdatePlan,
} from "#features/admin/api/admin-plans.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface EntitlementRow {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

const PlanDetail = React.memo(
	() => {
		const { t } = useTranslation();
		const { planId } = Route.useParams();
		const _navigate = useNavigate();
		const { data: plan, isLoading } = useAdminPlan(planId);
		const { data: featureKeys = [] } = useAdminFeatureKeys();
		const updatePlan = useUpdatePlan();
		const bulkUpsert = useBulkUpsertEntitlements();

		const [rows, setRows] = React.useState<EntitlementRow[]>([]);
		const [form, setForm] = React.useState({
			nameEn: "",
			nameAm: "",
			priceMonthlyEtb: 0,
			priceAnnualEtb: 0,
			priceCampaignDailyEtb: "" as string | number,
			buildingCap: "" as string | number,
			unitCap: "" as string | number,
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
				priceMonthlyEtb: plan.priceMonthlyEtb,
				priceAnnualEtb: plan.priceAnnualEtb,
				priceCampaignDailyEtb: plan.priceCampaignDailyEtb ?? "",
				buildingCap: plan.buildingCap ?? "",
				unitCap: plan.unitCap ?? "",
				userCap: plan.userCap ?? "",
				supportSlaHours: plan.supportSlaHours,
				sortOrder: plan.sortOrder,
				active: plan.active,
			});
			const byKey = new Map(plan.entitlements.map((e) => [e.featureKey, e] as const));
			const allRows: EntitlementRow[] = (featureKeys.length ? featureKeys : plan.entitlements.map((e) => e.featureKey))
				.slice()
				.sort()
				.map((k) => {
					const existing = byKey.get(k);
					return {
						featureKey: k,
						enabled: existing?.enabled ?? false,
						limit: existing?.limit ?? null,
					};
				});
			setRows(allRows);
		}, [plan, featureKeys]);

		const updateRow = React.useCallback(
			(key: string, patch: Partial<EntitlementRow>) =>
				setRows((prev) => prev.map((r) => (r.featureKey === key ? { ...r, ...patch } : r))),
			[],
		);

		const handleSavePlan = React.useCallback(async () => {
			if (!plan) return;
			const toNum = (v: string | number) => (v === "" ? null : Number(v));
			await updatePlan.mutateAsync({
				id: plan.id,
				nameEn: form.nameEn,
				nameAm: form.nameAm,
				priceMonthlyEtb: Number(form.priceMonthlyEtb),
				priceAnnualEtb: Number(form.priceAnnualEtb),
				priceCampaignDailyEtb: toNum(form.priceCampaignDailyEtb),
				buildingCap: toNum(form.buildingCap),
				unitCap: toNum(form.unitCap),
				userCap: toNum(form.userCap),
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
						← {t("admin.plans.backToPlans", { defaultValue: "Back to Plans" })}
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
								<Label>{t("admin.plans.nameEn", { defaultValue: "Name (English)" })}</Label>
								<Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.nameAm", { defaultValue: "Name (Amharic)" })}</Label>
								<Input value={form.nameAm} onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))} />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label>{t("admin.plans.monthly", { defaultValue: "Monthly (ETB)" })}</Label>
								<Input
									type="number"
									value={form.priceMonthlyEtb}
									onChange={(e) => setForm((f) => ({ ...f, priceMonthlyEtb: Number(e.target.value) }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.annual", { defaultValue: "Annual (ETB)" })}</Label>
								<Input
									type="number"
									value={form.priceAnnualEtb}
									onChange={(e) => setForm((f) => ({ ...f, priceAnnualEtb: Number(e.target.value) }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.campaignDaily", { defaultValue: "Campaign / Day (ETB)" })}</Label>
								<Input
									type="number"
									value={form.priceCampaignDailyEtb}
									onChange={(e) => setForm((f) => ({ ...f, priceCampaignDailyEtb: e.target.value }))}
									placeholder="blank = not campaign-eligible"
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
							<div className="space-y-1">
								<Label>{t("admin.plans.buildingCap", { defaultValue: "Building Cap" })}</Label>
								<Input
									type="number"
									value={form.buildingCap}
									onChange={(e) => setForm((f) => ({ ...f, buildingCap: e.target.value }))}
									placeholder="∞"
								/>
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.unitCap", { defaultValue: "Unit Cap" })}</Label>
								<Input
									type="number"
									value={form.unitCap}
									onChange={(e) => setForm((f) => ({ ...f, unitCap: e.target.value }))}
									placeholder="∞"
								/>
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.userCap", { defaultValue: "User Cap" })}</Label>
								<Input
									type="number"
									value={form.userCap}
									onChange={(e) => setForm((f) => ({ ...f, userCap: e.target.value }))}
									placeholder="∞"
								/>
							</div>
							<div className="space-y-1">
								<Label>{t("admin.plans.slaHours", { defaultValue: "SLA Hours" })}</Label>
								<Input
									type="number"
									value={form.supportSlaHours}
									onChange={(e) => setForm((f) => ({ ...f, supportSlaHours: Number(e.target.value) }))}
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
						<CardTitle className="text-base">
							{t("admin.plans.entitlements", { defaultValue: "Feature Entitlements" })}
						</CardTitle>
						<Button onClick={handleSaveEntitlements} disabled={bulkUpsert.isPending} size="sm">
							{bulkUpsert.isPending
								? t("common.saving")
								: t("admin.plans.saveEntitlements", { defaultValue: "Save Entitlements" })}
						</Button>
					</CardHeader>
					<CardContent className="p-0 overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-muted/40">
								<tr>
									<th className="text-left p-2">{t("admin.plans.feature", { defaultValue: "Feature Key" })}</th>
									<th className="text-center p-2 w-24">{t("admin.plans.enabled", { defaultValue: "Enabled" })}</th>
									<th className="text-right p-2 w-32">
										{t("admin.plans.limit", { defaultValue: "Limit (∞ = blank)" })}
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.featureKey} className="border-t">
										<td className="p-2 font-mono text-xs">{r.featureKey}</td>
										<td className="p-2 text-center">
											<input
												type="checkbox"
												checked={r.enabled}
												onChange={(e) => updateRow(r.featureKey, { enabled: e.target.checked })}
											/>
										</td>
										<td className="p-2 text-right">
											<Input
												type="number"
												value={r.limit ?? ""}
												onChange={(e) =>
													updateRow(r.featureKey, { limit: e.target.value === "" ? null : Number(e.target.value) })
												}
												disabled={!r.enabled}
												className="w-24 text-right font-mono"
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
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

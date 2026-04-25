import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useCreatePlan } from "#features/admin/api/admin-plans.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NewPlanPage = React.memo(
	() => {
		const { t } = useTranslation();
		const navigate = useNavigate();
		const create = useCreatePlan();
		const [form, setForm] = React.useState({
			slug: "",
			nameEn: "",
			nameAm: "",
			priceMonthlyEtb: 0,
			priceAnnualEtb: 0,
			priceCampaignDailyEtb: "" as string,
			buildingCap: "" as string,
			unitCap: "" as string,
			userCap: "" as string,
			supportSlaHours: 48,
			sortOrder: 100,
		});

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				const toNum = (v: string) => (v === "" ? null : Number(v));
				const res = await create.mutateAsync({
					slug: form.slug,
					nameEn: form.nameEn,
					nameAm: form.nameAm,
					priceMonthlyEtb: form.priceMonthlyEtb,
					priceAnnualEtb: form.priceAnnualEtb,
					priceCampaignDailyEtb: toNum(form.priceCampaignDailyEtb),
					buildingCap: toNum(form.buildingCap),
					unitCap: toNum(form.unitCap),
					userCap: toNum(form.userCap),
					supportSlaHours: form.supportSlaHours,
					sortOrder: form.sortOrder,
				});
				const data = (res as { data: { id: string } }).data;
				navigate({ to: "/admin/plans/$planId", params: { planId: data.id } });
			},
			[form, create, navigate],
		);

		return (
			<div className="space-y-6 max-w-3xl">
				<div>
					<Link to="/admin/plans" className="text-sm text-muted-foreground hover:underline">
						← {t("admin.plans.backToPlans", { defaultValue: "Back to Plans" })}
					</Link>
					<h1 className="text-2xl font-semibold mt-2">{t("admin.plans.newPlan", { defaultValue: "New Plan" })}</h1>
				</div>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("admin.plans.planDetails", { defaultValue: "Plan Details" })}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-1">
									<Label>{t("admin.plans.slug", { defaultValue: "Slug (unique)" })} *</Label>
									<Input
										value={form.slug}
										onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label>{t("admin.plans.nameEn", { defaultValue: "Name (English)" })} *</Label>
									<Input
										value={form.nameEn}
										onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label>{t("admin.plans.nameAm", { defaultValue: "Name (Amharic)" })} *</Label>
									<Input
										value={form.nameAm}
										onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-1">
									<Label>{t("admin.plans.monthly", { defaultValue: "Monthly (ETB)" })} *</Label>
									<Input
										type="number"
										value={form.priceMonthlyEtb}
										onChange={(e) => setForm((f) => ({ ...f, priceMonthlyEtb: Number(e.target.value) }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label>{t("admin.plans.annual", { defaultValue: "Annual (ETB)" })} *</Label>
									<Input
										type="number"
										value={form.priceAnnualEtb}
										onChange={(e) => setForm((f) => ({ ...f, priceAnnualEtb: Number(e.target.value) }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label>{t("admin.plans.campaignDaily", { defaultValue: "Campaign / Day (ETB)" })}</Label>
									<Input
										type="number"
										value={form.priceCampaignDailyEtb}
										onChange={(e) => setForm((f) => ({ ...f, priceCampaignDailyEtb: e.target.value }))}
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
									<Label>{t("admin.plans.slaHours", { defaultValue: "SLA Hours" })} *</Label>
									<Input
										type="number"
										value={form.supportSlaHours}
										onChange={(e) => setForm((f) => ({ ...f, supportSlaHours: Number(e.target.value) }))}
										required
									/>
								</div>
							</div>
							<Button type="submit" disabled={create.isPending}>
								{create.isPending ? t("common.saving") : t("admin.plans.createPlan", { defaultValue: "Create Plan" })}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	},
	() => true,
);
NewPlanPage.displayName = "NewPlanPage";

export const Route = createFileRoute("/admin/plans/new")({
	component: NewPlanPage,
});

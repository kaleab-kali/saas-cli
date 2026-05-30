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
			description: "",
			priceMonthlyMinor: 0,
			priceAnnualMinor: 0,
			currency: "USD",
			userCap: "" as string,
			supportSlaHours: 48,
			stripeSupported: true,
			chapaSupported: true,
			manualSupported: true,
			sortOrder: 100,
		});

		const handleSubmit = React.useCallback(
			async (event: React.FormEvent) => {
				event.preventDefault();
				const userCap = form.userCap === "" ? null : Number(form.userCap);
				const res = await create.mutateAsync({
					slug: form.slug,
					nameEn: form.nameEn,
					nameAm: form.nameAm,
					description: form.description || null,
					priceMonthlyMinor: form.priceMonthlyMinor,
					priceAnnualMinor: form.priceAnnualMinor,
					currency: form.currency,
					userCap,
					supportSlaHours: form.supportSlaHours,
					stripeSupported: form.stripeSupported,
					chapaSupported: form.chapaSupported,
					manualSupported: form.manualSupported,
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
						{"<-"} {t("admin.plans.backToPlans", { defaultValue: "Back to Plans" })}
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
									<Label htmlFor="plan-slug">{t("admin.plans.slug", { defaultValue: "Slug (unique)" })} *</Label>
									<Input
										id="plan-slug"
										value={form.slug}
										onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="plan-name-en">{t("admin.plans.nameEn", { defaultValue: "Name (English)" })} *</Label>
									<Input
										id="plan-name-en"
										value={form.nameEn}
										onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="plan-name-am">{t("admin.plans.nameAm", { defaultValue: "Name (Amharic)" })} *</Label>
									<Input
										id="plan-name-am"
										value={form.nameAm}
										onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
										required
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label htmlFor="plan-description">
									{t("admin.plans.description", { defaultValue: "Description" })}
								</Label>
								<Input
									id="plan-description"
									value={form.description}
									onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
								/>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-1">
									<Label htmlFor="plan-monthly">
										{t("admin.plans.monthly", { defaultValue: "Monthly (minor units)" })} *
									</Label>
									<Input
										id="plan-monthly"
										type="number"
										value={form.priceMonthlyMinor}
										onChange={(e) => setForm((f) => ({ ...f, priceMonthlyMinor: Number(e.target.value) }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="plan-annual">
										{t("admin.plans.annual", { defaultValue: "Annual (minor units)" })} *
									</Label>
									<Input
										id="plan-annual"
										type="number"
										value={form.priceAnnualMinor}
										onChange={(e) => setForm((f) => ({ ...f, priceAnnualMinor: Number(e.target.value) }))}
										required
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="plan-currency">{t("admin.plans.currency", { defaultValue: "Currency" })} *</Label>
									<Input
										id="plan-currency"
										value={form.currency}
										onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
										required
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
									<Label htmlFor="plan-sla-hours">{t("admin.plans.slaHours", { defaultValue: "SLA Hours" })} *</Label>
									<Input
										id="plan-sla-hours"
										type="number"
										value={form.supportSlaHours}
										onChange={(e) => setForm((f) => ({ ...f, supportSlaHours: Number(e.target.value) }))}
										required
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

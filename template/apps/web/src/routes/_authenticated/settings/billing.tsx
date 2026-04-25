import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	useActivateCampaign,
	useCampaigns,
	useCancelSubscription,
	useChangePlan,
	useInitiateChapa,
	usePlans,
	useRecordManualPayment,
	useResumeSubscription,
	useStartSubscription,
	useSubscription,
	useSubscriptionInvoices,
	useUsage,
} from "#features/billing/api/billing.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/billing")({ component: Page });

const formatEtb = (v: number) => `ETB ${v.toLocaleString("en-US")}`;

const UsageBar = React.memo(
	({ label, current, cap }: { readonly label: string; readonly current: number; readonly cap: number | null }) => {
		const pct = cap ? Math.min(100, Math.round((current / cap) * 100)) : 0;
		const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary";
		return (
			<div className="space-y-1">
				<div className="flex justify-between text-xs">
					<span>{label}</span>
					<span className="font-mono">
						{current} / {cap ?? "∞"}
					</span>
				</div>
				<div className="h-2 bg-muted rounded overflow-hidden">
					<div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
				</div>
			</div>
		);
	},
);
UsageBar.displayName = "UsageBar";

const PlanCard = React.memo(
	({
		plan,
		currentSlug,
		onSelect,
	}: {
		readonly plan: ReturnType<typeof usePlans>["data"] extends infer T
			? T extends { [k: number]: infer E }
				? E
				: never
			: never;
		readonly currentSlug: string | undefined;
		readonly onSelect: (slug: string, interval: "monthly" | "annual") => void;
	}) => {
		const { t } = useTranslation();
		if (!plan) return null;
		const isCurrent = plan.slug === currentSlug;
		const isEnterprise = plan.slug === "enterprise";
		return (
			<Card className={isCurrent ? "border-primary" : ""}>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>
							{plan.nameEn} <span className="text-muted-foreground text-sm">{plan.nameAm}</span>
						</span>
						{isCurrent && <Badge variant="default">{t("settings.billingExt.currentLabel")}</Badge>}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div>
						<div className="text-2xl font-bold">{formatEtb(plan.priceMonthlyEtb)}</div>
						<div className="text-xs text-muted-foreground">{t("settings.billingExt.perMonth")}</div>
						<div className="text-xs mt-1">
							{t("settings.billingExt.annualPrefix")} {formatEtb(plan.priceAnnualEtb)}{" "}
							<span className="text-green-600">{t("settings.billingExt.saveAnnualPct")}</span>
						</div>
					</div>
					<div className="text-sm space-y-1">
						<div>
							{t("settings.billingExt.buildingsLabel")}:{" "}
							<b>{plan.buildingCap ?? t("settings.billingExt.unlimitedLabel")}</b>
						</div>
						<div>
							{t("settings.billingExt.unitsLabel")}: <b>{plan.unitCap ?? t("settings.billingExt.unlimitedLabel")}</b>
						</div>
						<div>
							{t("settings.billingExt.usersLabel")}: <b>{plan.userCap ?? t("settings.billingExt.unlimitedLabel")}</b>
						</div>
						<div>
							{t("settings.billingExt.supportSlaLabel")}{" "}
							<b>
								{plan.supportSlaHours}
								{t("settings.billingExt.hoursSuffix")}
							</b>
						</div>
						{plan.priceCampaignDailyEtb && (
							<div className="text-xs text-muted-foreground">
								{t("settings.billingExt.campaignAddonLabel")} ETB {plan.priceCampaignDailyEtb}
								{t("settings.billingExt.perDay")}
							</div>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant={isCurrent ? "outline" : "default"}
							disabled={isCurrent}
							className="flex-1"
							onClick={() => onSelect(plan.slug, "monthly")}
						>
							{isCurrent ? t("settings.billingExt.currentPlanBtn") : t("settings.billingExt.chooseMonthlyBtn")}
						</Button>
						{!isEnterprise && (
							<Button
								size="sm"
								variant="outline"
								className="flex-1"
								onClick={() => onSelect(plan.slug, "annual")}
								disabled={isCurrent}
							>
								{t("settings.billingExt.annualBtn")}
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
	(a, b) => a.plan?.id === b.plan?.id && a.currentSlug === b.currentSlug,
);
PlanCard.displayName = "PlanCard";

const CampaignDialog = React.memo(() => {
	const { t } = useTranslation();
	const [open, setOpen] = React.useState(false);
	const [days, setDays] = React.useState(30);
	const activate = useActivateCampaign();
	const onActivate = React.useCallback(async () => {
		try {
			await activate.mutateAsync(days);
			setOpen(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : t("settings.billingExt.failed"));
		}
	}, [days, activate, t]);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="sm">
					{t("settings.billingExt.activateCampaignBtn")}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("settings.billingExt.campaignAddonTitle")}</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">{t("settings.billingExt.campaignDescLabel")}</p>
					<div>
						<Label>{t("settings.billingExt.daysLabel")}</Label>
						<Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
					</div>
					<div className="p-3 bg-muted rounded text-sm">
						{t("settings.billingExt.totalLabel")} <b>{formatEtb(days * 200)}</b> {t("settings.billingExt.vatLabel")}{" "}
						<b>{formatEtb(Math.round(days * 200 * 1.15))}</b>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						{t("settings.billingExt.cancelBtn")}
					</Button>
					<Button onClick={onActivate} disabled={activate.isPending}>
						{t("settings.billingExt.activateBtn")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
});
CampaignDialog.displayName = "CampaignDialog";

const ManualPaymentDialog = React.memo(
	({ invoiceId, outstanding }: { readonly invoiceId: string; readonly outstanding: number }) => {
		const { t } = useTranslation();
		const [open, setOpen] = React.useState(false);
		const [amount, setAmount] = React.useState(outstanding);
		const [method, setMethod] = React.useState("manual_bank_transfer");
		const [receiptNumber, setReceiptNumber] = React.useState("");
		const [bankReference, setBankReference] = React.useState("");
		const [note, setNote] = React.useState("");
		const record = useRecordManualPayment();

		const submit = React.useCallback(async () => {
			if (!receiptNumber && !bankReference) {
				toast.error(t("settings.billingExt.receiptOrBankRequired"));
				return;
			}
			try {
				await record.mutateAsync({
					invoiceId,
					amount,
					method,
					receiptNumber: receiptNumber || undefined,
					bankReference: bankReference || undefined,
					note: note || undefined,
				});
				setOpen(false);
			} catch (e) {
				toast.error(e instanceof Error ? e.message : t("settings.billingExt.failed"));
			}
		}, [invoiceId, amount, method, receiptNumber, bankReference, note, record, t]);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button size="sm" variant="outline">
						{t("settings.billingExt.recordPaymentBtn")}
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("settings.billingExt.recordManualPaymentTitle")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>{t("settings.billingExt.amountLabel")}</Label>
							<Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
						</div>
						<div>
							<Label>{t("settings.billingExt.methodLabel")}</Label>
							<Select value={method} onValueChange={setMethod}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="manual_cash">{t("settings.billingExt.methodCash")}</SelectItem>
									<SelectItem value="manual_bank_transfer">{t("settings.billingExt.methodBankTransfer")}</SelectItem>
									<SelectItem value="manual_telebirr">{t("settings.billingExt.methodTelebirr")}</SelectItem>
									<SelectItem value="manual_cheque">{t("settings.billingExt.methodCheque")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>{t("settings.billingExt.receiptLabel")}</Label>
							<Input
								value={receiptNumber}
								onChange={(e) => setReceiptNumber(e.target.value)}
								placeholder={t("settings.billingExt.receiptPlaceholder")}
							/>
						</div>
						<div>
							<Label>{t("settings.billingExt.bankRefLabel")}</Label>
							<Input
								value={bankReference}
								onChange={(e) => setBankReference(e.target.value)}
								placeholder={t("settings.billingExt.bankRefPlaceholder")}
							/>
						</div>
						<div>
							<Label>{t("settings.billingExt.noteLabel")}</Label>
							<Input value={note} onChange={(e) => setNote(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							{t("settings.billingExt.cancelBtn")}
						</Button>
						<Button onClick={submit} disabled={record.isPending}>
							{t("settings.billingExt.recordBtn")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
);
ManualPaymentDialog.displayName = "ManualPaymentDialog";

function Page() {
	const { t } = useTranslation();
	const { data: plans = [] } = usePlans();
	const { data: subData } = useSubscription();
	const { data: usage } = useUsage();
	const { data: invoicesRes } = useSubscriptionInvoices();
	const { data: campaigns = [] } = useCampaigns();

	const start = useStartSubscription();
	const change = useChangePlan();
	const cancel = useCancelSubscription();
	const resume = useResumeSubscription();
	const chapa = useInitiateChapa();

	const subscription = subData?.subscription ?? null;
	const currentPlan = subData?.plan ?? null;
	const activeCampaign = subData?.campaign ?? null;
	const invoices = invoicesRes?.data ?? [];

	const onSelect = React.useCallback(
		async (slug: string, interval: "monthly" | "annual") => {
			try {
				if (!subscription) {
					await start.mutateAsync({ planSlug: slug, billingInterval: interval });
				} else {
					await change.mutateAsync({ planSlug: slug, billingInterval: interval });
				}
			} catch (e) {
				toast.error(e instanceof Error ? e.message : t("settings.billingExt.failed"));
			}
		},
		[subscription, start, change, t],
	);

	return (
		<div className="p-6 space-y-6 max-w-6xl">
			<div>
				<h1 className="text-2xl font-bold">{t("billing.title")}</h1>
				<p className="text-sm text-muted-foreground">{t("billing.subtitle")}</p>
			</div>

			{subscription && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>
								{t("settings.billingExt.currentPlanHeading")} {currentPlan?.nameEn}
							</span>
							<Badge variant={subscription.status === "active" ? "default" : "secondary"}>
								{t(`billing.status.${subscription.status}`, { defaultValue: subscription.status })}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<div className="text-muted-foreground">{t("settings.billingExt.periodLabel")}</div>
								<div>
									{new Date(subscription.currentPeriodStart).toLocaleDateString()} →{" "}
									{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
								</div>
							</div>
							<div>
								<div className="text-muted-foreground">{t("settings.billingExt.billingLabel")}</div>
								<div>
									{subscription.billingInterval} ({subscription.currency})
								</div>
							</div>
						</div>
						{activeCampaign && (
							<div className="p-3 border border-green-500/30 bg-green-500/10 rounded text-sm">
								{t("settings.billingExt.campaignActiveLabel", {
									date: new Date(activeCampaign.endsAt).toLocaleDateString(),
									days: activeCampaign.days,
									total: formatEtb(activeCampaign.totalEtb),
								})}
							</div>
						)}
						<div className="flex gap-2">
							{subscription.cancelAtPeriodEnd ? (
								<Button size="sm" variant="outline" onClick={() => resume.mutate()}>
									{t("settings.billingExt.resumeBtn")}
								</Button>
							) : (
								<Button size="sm" variant="outline" onClick={() => cancel.mutate(false)}>
									{t("settings.billingExt.cancelPeriodEndBtn")}
								</Button>
							)}
							{subscription.planSlug !== "enterprise" && <CampaignDialog />}
						</div>
					</CardContent>
				</Card>
			)}

			{usage && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("settings.billingExt.usageHeading")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<UsageBar
							label={t("settings.billingExt.buildingsLabel")}
							current={usage.buildingCount}
							cap={usage.caps.buildings}
						/>
						<UsageBar label={t("settings.billingExt.unitsLabel")} current={usage.unitCount} cap={usage.caps.units} />
						<UsageBar label={t("settings.billingExt.usersLabel")} current={usage.userCount} cap={usage.caps.users} />
					</CardContent>
				</Card>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-3">{t("settings.billingExt.plansHeading")}</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{plans.map((p) => (
						<PlanCard key={p.id} plan={p} currentSlug={currentPlan?.slug} onSelect={onSelect} />
					))}
				</div>
			</div>

			{campaigns.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">{t("settings.billingExt.campaignsHeading")}</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<table className="w-full text-sm">
							<thead className="text-left border-b">
								<tr>
									<th className="py-2 px-3">{t("settings.billingExt.daysCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.rateCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.totalCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.startsCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.endsCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.statusCol")}</th>
								</tr>
							</thead>
							<tbody>
								{campaigns.map((c) => (
									<tr key={c.id} className="border-b">
										<td className="py-2 px-3">{c.days}</td>
										<td className="py-2 px-3">
											{formatEtb(c.dailyRateEtb)}
											{t("settings.billingExt.perDay")}
										</td>
										<td className="py-2 px-3">{formatEtb(c.totalEtb)}</td>
										<td className="py-2 px-3 text-xs">{new Date(c.startsAt).toLocaleDateString()}</td>
										<td className="py-2 px-3 text-xs">{new Date(c.endsAt).toLocaleDateString()}</td>
										<td className="py-2 px-3">
											<Badge>{c.status}</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.billingExt.invoicesHeading")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{invoices.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("billing.noInvoices")}</p>
					) : (
						<table className="w-full text-sm">
							<thead className="text-left border-b">
								<tr>
									<th className="py-2 px-3">{t("settings.billingExt.numberCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.typeCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.issuedCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.dueCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.subtotalCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.vatCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.totalCol2")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.paidCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.statusCol")}</th>
									<th className="py-2 px-3">{t("settings.billingExt.actionsCol")}</th>
								</tr>
							</thead>
							<tbody>
								{invoices.map((inv) => {
									const outstanding = inv.total - inv.amountPaid;
									return (
										<tr key={inv.id} className="border-b">
											<td className="py-2 px-3 font-mono text-xs">{inv.number}</td>
											<td className="py-2 px-3 text-xs">{inv.lineType}</td>
											<td className="py-2 px-3 text-xs">{new Date(inv.issueDate).toLocaleDateString()}</td>
											<td className="py-2 px-3 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
											<td className="py-2 px-3 text-right">{formatEtb(inv.subtotal)}</td>
											<td className="py-2 px-3 text-right text-xs">{formatEtb(inv.vatAmount)}</td>
											<td className="py-2 px-3 text-right font-semibold">{formatEtb(inv.total)}</td>
											<td className="py-2 px-3 text-right">{formatEtb(inv.amountPaid)}</td>
											<td className="py-2 px-3">
												<Badge
													variant={
														inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"
													}
												>
													{t(`billing.invoiceStatus.${inv.status}`, { defaultValue: inv.status })}
												</Badge>
											</td>
											<td className="py-2 px-3">
												<div className="flex gap-1">
													<Button size="sm" variant="ghost" asChild>
														<a href={`/api/v1/billing/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
															{t("settings.billingExt.pdfBtn")}
														</a>
													</Button>
													{outstanding > 0 && (
														<>
															<Button
																size="sm"
																variant="outline"
																onClick={() => chapa.mutate(inv.id)}
																disabled={chapa.isPending}
															>
																{t("settings.billingExt.payOnlineBtn")}
															</Button>
															<ManualPaymentDialog invoiceId={inv.id} outstanding={outstanding} />
														</>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

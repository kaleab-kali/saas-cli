import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	type Plan,
	type SubscriptionInvoice,
	useCancelSubscription,
	useChangePlan,
	useInitiateChapa,
	useInitiateStripe,
	usePlans,
	useRecordManualPayment,
	useResumeSubscription,
	useStartSubscription,
	useStripePortal,
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
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	component: BillingSettings,
});

const formatMoney = (minor: number, currency: string) =>
	new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);

const StatusBadge = React.memo(({ status }: { readonly status: string }) => {
	const variant: "default" | "secondary" | "destructive" | "outline" =
		status === "active" || status === "paid"
			? "default"
			: status === "trialing"
				? "secondary"
				: status === "past_due" || status === "overdue" || status === "locked"
					? "destructive"
					: "outline";
	return <Badge variant={variant}>{status}</Badge>;
});
StatusBadge.displayName = "StatusBadge";

const ManualPaymentDialog = React.memo(
	({
		inv,
		onRecord,
		disabled,
	}: {
		readonly inv: SubscriptionInvoice;
		readonly onRecord: (
			invoiceId: string,
			dto: {
				amountMinor: number;
				method: string;
				receiptNumber?: string;
				bankReference?: string;
				note?: string;
				paidAt?: string;
			},
		) => void;
		readonly disabled: boolean;
	}) => {
		const [open, setOpen] = React.useState(false);
		const outstandingMinor = Math.max(inv.totalMinor - inv.amountPaidMinor, 0);
		const [amountMinor, setAmountMinor] = React.useState(String(outstandingMinor));
		const [receiptNumber, setReceiptNumber] = React.useState("");
		const [bankReference, setBankReference] = React.useState("");
		const [note, setNote] = React.useState("");

		React.useEffect(() => {
			if (open) setAmountMinor(String(outstandingMinor));
		}, [open, outstandingMinor]);

		const submit = React.useCallback(() => {
			const amount = Number(amountMinor);
			if (!amount || amount <= 0) {
				toast.error("Payment amount is required");
				return;
			}
			if (!receiptNumber.trim() && !bankReference.trim()) {
				toast.error("Add a receipt number or bank reference");
				return;
			}
			onRecord(inv.id, {
				amountMinor: amount,
				method: "manual_bank",
				receiptNumber: receiptNumber.trim() || undefined,
				bankReference: bankReference.trim() || undefined,
				note: note.trim() || undefined,
				paidAt: new Date().toISOString(),
			});
			setOpen(false);
			setReceiptNumber("");
			setBankReference("");
			setNote("");
		}, [amountMinor, bankReference, inv.id, note, onRecord, receiptNumber]);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button size="sm" variant="outline" disabled={disabled}>
						Manual
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record manual payment</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor={`manual-payment-amount-${inv.id}`}>Amount (minor units)</Label>
								<Input
									id={`manual-payment-amount-${inv.id}`}
									type="number"
									min={1}
									value={amountMinor}
									onChange={(e) => setAmountMinor(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={`manual-payment-receipt-${inv.id}`}>Receipt number</Label>
								<Input
									id={`manual-payment-receipt-${inv.id}`}
									value={receiptNumber}
									onChange={(e) => setReceiptNumber(e.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`manual-payment-bank-${inv.id}`}>Bank reference</Label>
							<Input
								id={`manual-payment-bank-${inv.id}`}
								value={bankReference}
								onChange={(e) => setBankReference(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`manual-payment-note-${inv.id}`}>Note</Label>
							<Input id={`manual-payment-note-${inv.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={submit} disabled={disabled}>
							Submit payment
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
	(prev, next) =>
		prev.inv.id === next.inv.id &&
		prev.inv.totalMinor === next.inv.totalMinor &&
		prev.inv.amountPaidMinor === next.inv.amountPaidMinor &&
		prev.disabled === next.disabled,
);
ManualPaymentDialog.displayName = "ManualPaymentDialog";

const PlanCard = React.memo(
	({
		plan,
		isCurrent,
		onSelect,
		interval,
	}: {
		readonly plan: Plan;
		readonly isCurrent: boolean;
		readonly onSelect: (slug: string) => void;
		readonly interval: "monthly" | "annual";
	}) => {
		const { t } = useTranslation();
		const priceMinor = interval === "annual" ? plan.priceAnnualMinor : plan.priceMonthlyMinor;
		return (
			<Card className={isCurrent ? "ring-2 ring-primary" : ""}>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>{plan.nameEn}</span>
						{isCurrent && <Badge>{t("billing.currentPlan", { defaultValue: "Current" })}</Badge>}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="text-2xl font-bold">{formatMoney(priceMinor, plan.currency)}</div>
					<div className="text-xs text-muted-foreground">/{interval === "annual" ? "yr" : "mo"}</div>
					{plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
					<ul className="text-sm space-y-1">
						{plan.userCap !== null && <li>{t("billing.userCap", { defaultValue: "{{n}} users", n: plan.userCap })}</li>}
						<li>SLA: {plan.supportSlaHours}h</li>
						<li>
							{t("billing.gateways", { defaultValue: "Pay via" })}:{" "}
							{[plan.stripeSupported && "Stripe", plan.chapaSupported && "Chapa", plan.manualSupported && "Manual"]
								.filter(Boolean)
								.join(", ")}
						</li>
					</ul>
					<Button onClick={() => onSelect(plan.slug)} disabled={isCurrent} className="w-full" size="sm">
						{isCurrent
							? t("billing.activePlan", { defaultValue: "Active" })
							: t("billing.choosePlan", { defaultValue: "Choose plan" })}
					</Button>
				</CardContent>
			</Card>
		);
	},
	(prev, next) =>
		prev.plan.slug === next.plan.slug && prev.isCurrent === next.isCurrent && prev.interval === next.interval,
);
PlanCard.displayName = "PlanCard";

const InvoiceRow = React.memo(
	({
		inv,
		onPayChapa,
		onPayStripe,
		onRecordManualPayment,
		recordingManualPayment,
	}: {
		readonly inv: SubscriptionInvoice;
		readonly onPayChapa: (id: string) => void;
		readonly onPayStripe: (id: string) => void;
		readonly onRecordManualPayment: (
			id: string,
			dto: {
				amountMinor: number;
				method: string;
				receiptNumber?: string;
				bankReference?: string;
				note?: string;
				paidAt?: string;
			},
		) => void;
		readonly recordingManualPayment: boolean;
	}) => {
		const isOpen = inv.status === "sent" || inv.status === "overdue" || inv.status === "pending_payment";
		return (
			<tr className="border-t">
				<td className="py-2 px-3 font-mono text-xs">{inv.number}</td>
				<td className="py-2 px-3">
					<StatusBadge status={inv.status} />
				</td>
				<td className="py-2 px-3 text-right">{formatMoney(inv.subtotalMinor, inv.currency)}</td>
				<td className="py-2 px-3 text-right text-xs">{formatMoney(inv.taxMinor, inv.currency)}</td>
				<td className="py-2 px-3 text-right font-semibold">{formatMoney(inv.totalMinor, inv.currency)}</td>
				<td className="py-2 px-3 text-right">{formatMoney(inv.amountPaidMinor, inv.currency)}</td>
				<td className="py-2 px-3 text-xs text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</td>
				<td className="py-2 px-3 text-right space-x-1">
					{isOpen && (
						<>
							<ManualPaymentDialog inv={inv} onRecord={onRecordManualPayment} disabled={recordingManualPayment} />
							<Button size="sm" variant="default" onClick={() => onPayStripe(inv.id)}>
								Stripe
							</Button>
							<Button size="sm" variant="secondary" onClick={() => onPayChapa(inv.id)}>
								Chapa
							</Button>
						</>
					)}
					{inv.pdfUrl && (
						<Button size="sm" variant="outline" asChild>
							<a href={inv.pdfUrl} target="_blank" rel="noreferrer">
								PDF
							</a>
						</Button>
					)}
				</td>
			</tr>
		);
	},
	(prev, next) =>
		prev.inv.id === next.inv.id &&
		prev.inv.status === next.inv.status &&
		prev.inv.amountPaidMinor === next.inv.amountPaidMinor &&
		prev.recordingManualPayment === next.recordingManualPayment,
);
InvoiceRow.displayName = "InvoiceRow";

function BillingSettings() {
	const { t } = useTranslation();
	const { data: plansData, isLoading: plansLoading } = usePlans();
	const { data: subData, isLoading: subLoading } = useSubscription();
	const { data: usage } = useUsage();
	const { data: invoicesRes } = useSubscriptionInvoices();
	const startSub = useStartSubscription();
	const changePlan = useChangePlan();
	const cancelSubscription = useCancelSubscription();
	const resumeSubscription = useResumeSubscription();
	const recordManualPayment = useRecordManualPayment();
	const initiateChapa = useInitiateChapa();
	const initiateStripe = useInitiateStripe();
	const stripePortal = useStripePortal();

	const [interval, setIntervalState] = React.useState<"monthly" | "annual">("monthly");

	const handleSelect = React.useCallback(
		(slug: string) => {
			if (subData?.subscription) {
				changePlan.mutate({ planSlug: slug, billingInterval: interval });
			} else {
				startSub.mutate({ planSlug: slug, billingInterval: interval });
			}
		},
		[subData?.subscription, interval, changePlan, startSub],
	);

	const handlePayChapa = React.useCallback((invoiceId: string) => initiateChapa.mutate(invoiceId), [initiateChapa]);
	const handlePayStripe = React.useCallback((invoiceId: string) => initiateStripe.mutate(invoiceId), [initiateStripe]);
	const handleRecordManualPayment = React.useCallback(
		(
			invoiceId: string,
			dto: {
				amountMinor: number;
				method: string;
				receiptNumber?: string;
				bankReference?: string;
				note?: string;
				paidAt?: string;
			},
		) => recordManualPayment.mutate({ invoiceId, ...dto }),
		[recordManualPayment],
	);
	const handleCancelAtPeriodEnd = React.useCallback(() => {
		if (window.confirm("Cancel this subscription at the end of the current billing period?")) {
			cancelSubscription.mutate(false);
		}
	}, [cancelSubscription]);
	const handleResumeSubscription = React.useCallback(() => resumeSubscription.mutate(), [resumeSubscription]);

	if (plansLoading || subLoading) return <Skeleton className="h-96" />;

	const plans = plansData ?? [];
	const sub = subData?.subscription ?? null;
	const currentPlan = subData?.plan ?? null;

	return (
		<div className="space-y-6 max-w-6xl">
			<div>
				<h1 className="text-2xl font-bold">{t("settings.billing", { defaultValue: "Billing" })}</h1>
				<p className="text-muted-foreground">
					{t("settings.billingDesc", { defaultValue: "Plan, invoices, and payment method." })}
				</p>
			</div>

			{sub && (
				<Card>
					<CardHeader>
						<CardTitle>{t("billing.currentSubscription", { defaultValue: "Current subscription" })}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-4">
						<div>
							<div className="text-xs text-muted-foreground">{t("billing.plan", { defaultValue: "Plan" })}</div>
							<div className="font-medium">{currentPlan?.nameEn ?? sub.planSlug}</div>
						</div>
						<div>
							<div className="text-xs text-muted-foreground">{t("billing.status", { defaultValue: "Status" })}</div>
							<StatusBadge status={sub.status} />
						</div>
						<div>
							<div className="text-xs text-muted-foreground">{t("billing.gateway", { defaultValue: "Gateway" })}</div>
							<Badge variant="outline">{sub.gateway}</Badge>
						</div>
						<div>
							<div className="text-xs text-muted-foreground">{t("billing.renewsOn", { defaultValue: "Renews" })}</div>
							<div className="font-medium">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
						</div>
						<div className="md:col-span-4 flex flex-wrap gap-2 items-center">
							{sub.cancelAtPeriodEnd ? (
								<>
									<Badge variant="secondary">Cancels at period end</Badge>
									<Button
										size="sm"
										variant="outline"
										onClick={handleResumeSubscription}
										disabled={resumeSubscription.isPending}
									>
										{resumeSubscription.isPending ? "Resuming..." : "Resume subscription"}
									</Button>
								</>
							) : (
								<Button
									size="sm"
									variant="outline"
									onClick={handleCancelAtPeriodEnd}
									disabled={cancelSubscription.isPending}
								>
									{cancelSubscription.isPending ? "Canceling..." : "Cancel at period end"}
								</Button>
							)}
							{sub.gateway === "stripe" && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => stripePortal.mutate()}
									disabled={stripePortal.isPending}
								>
									{stripePortal.isPending
										? t("billing.openingPortal", { defaultValue: "Opening..." })
										: t("billing.customerPortal", { defaultValue: "Billing portal" })}
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{usage && (
				<Card>
					<CardHeader>
						<CardTitle>{t("billing.usage", { defaultValue: "Usage" })}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span>{t("billing.users", { defaultValue: "Users" })}</span>
							<span className="font-mono">
								{usage.userCount} / {usage.caps.users ?? "∞"}
							</span>
						</div>
					</CardContent>
				</Card>
			)}

			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">{t("billing.plans", { defaultValue: "Plans" })}</h2>
					<div className="flex gap-2">
						<Button
							variant={interval === "monthly" ? "default" : "outline"}
							size="sm"
							onClick={() => setIntervalState("monthly")}
						>
							{t("billing.monthly", { defaultValue: "Monthly" })}
						</Button>
						<Button
							variant={interval === "annual" ? "default" : "outline"}
							size="sm"
							onClick={() => setIntervalState("annual")}
						>
							{t("billing.annual", { defaultValue: "Annual" })}
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{plans.map((plan) => (
						<PlanCard
							key={plan.id}
							plan={plan}
							isCurrent={currentPlan?.slug === plan.slug}
							onSelect={handleSelect}
							interval={interval}
						/>
					))}
				</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold mb-3">{t("billing.invoices", { defaultValue: "Invoices" })}</h2>
				<Card>
					<CardContent className="p-0 overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-muted-foreground bg-muted/50">
									<th className="py-2 px-3 text-left">#</th>
									<th className="py-2 px-3 text-left">Status</th>
									<th className="py-2 px-3 text-right">Subtotal</th>
									<th className="py-2 px-3 text-right">Tax</th>
									<th className="py-2 px-3 text-right">Total</th>
									<th className="py-2 px-3 text-right">Paid</th>
									<th className="py-2 px-3 text-left">Due</th>
									<th className="py-2 px-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{(invoicesRes?.data ?? []).map((inv) => (
									<InvoiceRow
										key={inv.id}
										inv={inv}
										onPayChapa={handlePayChapa}
										onPayStripe={handlePayStripe}
										onRecordManualPayment={handleRecordManualPayment}
										recordingManualPayment={recordManualPayment.isPending}
									/>
								))}
								{(!invoicesRes?.data || invoicesRes.data.length === 0) && (
									<tr>
										<td colSpan={8} className="py-8 text-center text-muted-foreground">
											{t("billing.noInvoices", { defaultValue: "No invoices yet" })}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

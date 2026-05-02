import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	useAdminSubscription,
	useChangeSubscriptionPlan,
	useCreateManualInvoice,
	useCreditAccount,
	useDunningLog,
	useExtendSubscription,
	useForceSubscriptionStatus,
	useRecordManualPayment,
	useSendDunning,
	useSendInvoice,
	useToggleManualMode,
	useVoidInvoice,
} from "#features/admin/api/admin-billing.hooks";
import { useUsageHistory } from "#features/admin/api/admin-billing-dashboard.hooks";
import { useAdminPlans } from "#features/admin/api/admin-plans.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const METHODS = ["cash", "bank_transfer", "telebirr", "cbe_birr", "cheque", "chapa_online"] as const;
const FORCE_STATUSES = [
	"active",
	"trialing",
	"past_due",
	"grace",
	"read_only",
	"locked",
	"suspended",
	"canceled",
] as const;

const SubscriptionDetail = React.memo(
	() => {
		const { t } = useTranslation();
		const { subscriptionId } = Route.useParams();
		const { data: sub, isLoading } = useAdminSubscription(subscriptionId);
		const { data: plans = [] } = useAdminPlans(false);

		const createInvoice = useCreateManualInvoice();
		const sendInvoice = useSendInvoice();
		const voidInvoice = useVoidInvoice();
		const recordPayment = useRecordManualPayment();
		const extend = useExtendSubscription();
		const toggleManual = useToggleManualMode();
		const creditAcc = useCreditAccount();
		const changePlan = useChangeSubscriptionPlan();
		const forceStatus = useForceSubscriptionStatus();
		const { data: dunningLog = [] } = useDunningLog(subscriptionId);
		const sendDunning = useSendDunning();

		const [extendDays, setExtendDays] = React.useState("30");
		const [extendReason, setExtendReason] = React.useState("");
		const [creditAmount, setCreditAmount] = React.useState("");
		const [creditNote, setCreditNote] = React.useState("");
		const [newPlanId, setNewPlanId] = React.useState("");
		const [newStatus, setNewStatus] = React.useState("active");
		const [statusReason, setStatusReason] = React.useState("");

		const [invoiceForm, setInvoiceForm] = React.useState({
			amountEtb: "",
			periodStart: "",
			periodEnd: "",
			description: "",
		});
		const [paymentForm, setPaymentForm] = React.useState({
			amount: "",
			method: "cash",
			receiptNumber: "",
			bankReference: "",
			note: "",
			paidAt: new Date().toISOString().slice(0, 10),
			forInvoiceId: "",
		});

		const handleCreateInvoice = React.useCallback(async () => {
			if (!invoiceForm.amountEtb || !invoiceForm.periodStart || !invoiceForm.periodEnd) return;
			await createInvoice.mutateAsync({
				subscriptionId,
				amountEtb: Number(invoiceForm.amountEtb),
				periodStart: invoiceForm.periodStart,
				periodEnd: invoiceForm.periodEnd,
				description: invoiceForm.description || undefined,
			});
			setInvoiceForm({ amountEtb: "", periodStart: "", periodEnd: "", description: "" });
		}, [invoiceForm, createInvoice, subscriptionId]);

		const handleRecordPayment = React.useCallback(
			async (invoiceId: string) => {
				if (!paymentForm.amount) return;
				await recordPayment.mutateAsync({
					invoiceId,
					amount: Number(paymentForm.amount),
					method: paymentForm.method,
					receiptNumber: paymentForm.receiptNumber || undefined,
					bankReference: paymentForm.bankReference || undefined,
					note: paymentForm.note || undefined,
					paidAt: paymentForm.paidAt,
				});
				setPaymentForm({
					amount: "",
					method: "cash",
					receiptNumber: "",
					bankReference: "",
					note: "",
					paidAt: new Date().toISOString().slice(0, 10),
					forInvoiceId: "",
				});
			},
			[paymentForm, recordPayment],
		);

		if (isLoading || !sub) return <Skeleton className="h-96 w-full" />;

		const lifecycle = sub.lifecycle;

		return (
			<div className="space-y-6">
				<div>
					<Link to="/admin/billing" className="text-sm text-muted-foreground hover:underline">
						← {t("admin.billing.backToSubs", { defaultValue: "Back to Subscriptions" })}
					</Link>
					<h1 className="text-2xl font-semibold mt-2">
						{sub.organization?.name ?? t("admin.billing.subDetail", { defaultValue: "Subscription" })}
					</h1>
					<p className="text-sm text-muted-foreground">
						{sub.organization?.slug && <span className="mr-2">@{sub.organization.slug}</span>}
						<code className="text-[11px]">{sub.organizationId}</code>
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">
								{t("admin.billing.currentPlan", { defaultValue: "Plan" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-lg font-semibold">{sub.plan.nameEn}</div>
							<div className="text-xs text-muted-foreground">{sub.billingInterval}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">
								{t("admin.billing.status", { defaultValue: "Status" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge className="text-sm capitalize">{sub.status.replace("_", " ")}</Badge>
							{sub.manualPaymentMode && (
								<Badge variant="outline" className="ml-1 text-[10px]">
									{t("admin.billing.manualMode", { defaultValue: "Manual" })}
								</Badge>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">
								{t("admin.billing.periodEnd", { defaultValue: "Period Ends" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-lg font-semibold">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
							{lifecycle && lifecycle.daysExpired > 0 && (
								<div className="text-xs text-destructive">
									{t("admin.billing.daysExpired", {
										count: lifecycle.daysExpired,
										defaultValue: "{{count}} days past due",
									})}
								</div>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">
								{t("admin.billing.credit", { defaultValue: "Credit Balance" })}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-lg font-semibold font-mono">{sub.creditBalanceEtb} ETB</div>
						</CardContent>
					</Card>
				</div>

				{lifecycle && (lifecycle.daysUntilReadOnly !== null || lifecycle.daysUntilLocked !== null) && (
					<Card className="border-yellow-500/50 bg-yellow-500/5">
						<CardContent className="py-3 text-sm space-y-1">
							{lifecycle.gracePeriodEndsAt && (
								<div>
									<span className="text-muted-foreground">
										{t("admin.billing.graceEnds", { defaultValue: "Grace ends" })}:
									</span>{" "}
									{new Date(lifecycle.gracePeriodEndsAt).toLocaleString()} (
									{t("admin.billing.inDays", {
										count: lifecycle.daysUntilReadOnly ?? 0,
										defaultValue: "in {{count}}d",
									})}
									)
								</div>
							)}
							{lifecycle.readOnlyModeEndsAt && (
								<div>
									<span className="text-muted-foreground">
										{t("admin.billing.readOnlyEnds", { defaultValue: "Read-only ends" })}:
									</span>{" "}
									{new Date(lifecycle.readOnlyModeEndsAt).toLocaleString()} (
									{t("admin.billing.lockIn", {
										count: lifecycle.daysUntilLocked ?? 0,
										defaultValue: "lock in {{count}}d",
									})}
									)
								</div>
							)}
						</CardContent>
					</Card>
				)}

				<Tabs defaultValue="invoices">
					<TabsList>
						<TabsTrigger value="invoices">
							{t("admin.billing.tab.invoices", { defaultValue: "Invoices" })} ({sub.invoices.length})
						</TabsTrigger>
						<TabsTrigger value="actions">{t("admin.billing.tab.actions", { defaultValue: "Actions" })}</TabsTrigger>
						<TabsTrigger value="dunning">Dunning ({dunningLog.length})</TabsTrigger>
						<TabsTrigger value="usage">Usage</TabsTrigger>
					</TabsList>

					<TabsContent value="invoices" className="mt-4 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.createManualInvoice", { defaultValue: "Create manual invoice" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
									<div className="space-y-1">
										<Label>{t("admin.billing.amountEtb", { defaultValue: "Amount (ETB, excl. VAT)" })}</Label>
										<Input
											type="number"
											value={invoiceForm.amountEtb}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, amountEtb: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label>{t("admin.billing.periodStart", { defaultValue: "Period Start" })}</Label>
										<Input
											type="date"
											value={invoiceForm.periodStart}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, periodStart: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label>{t("admin.billing.periodEndLbl", { defaultValue: "Period End" })}</Label>
										<Input
											type="date"
											value={invoiceForm.periodEnd}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, periodEnd: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label>{t("admin.billing.description", { defaultValue: "Description" })}</Label>
										<Input
											value={invoiceForm.description}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
										/>
									</div>
								</div>
								<Button onClick={handleCreateInvoice} disabled={createInvoice.isPending} size="sm">
									{createInvoice.isPending
										? t("common.saving")
										: t("admin.billing.createInvoice", { defaultValue: "Create Invoice" })}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-0 overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-muted/40">
										<tr>
											<th className="text-left p-2">{t("admin.billing.col.number", { defaultValue: "Number" })}</th>
											<th className="text-left p-2">{t("admin.billing.col.status", { defaultValue: "Status" })}</th>
											<th className="text-left p-2">{t("admin.billing.col.due", { defaultValue: "Due" })}</th>
											<th className="text-right p-2">{t("admin.billing.col.total", { defaultValue: "Total" })}</th>
											<th className="text-right p-2">{t("admin.billing.col.paid", { defaultValue: "Paid" })}</th>
											<th className="text-right p-2">{t("common.actions")}</th>
										</tr>
									</thead>
									<tbody>
										{sub.invoices.map((inv) => (
											<tr key={inv.id} className="border-t">
												<td className="p-2 font-medium">{inv.number}</td>
												<td className="p-2">
													<Badge variant="outline" className="capitalize text-xs">
														{inv.status}
													</Badge>
												</td>
												<td className="p-2">{new Date(inv.dueDate).toLocaleDateString()}</td>
												<td className="p-2 text-right font-mono">{inv.total.toFixed(2)}</td>
												<td className="p-2 text-right font-mono">{inv.amountPaid.toFixed(2)}</td>
												<td className="p-2 text-right space-x-1">
													{inv.status === "draft" && (
														<Button
															size="sm"
															variant="outline"
															onClick={() => sendInvoice.mutate(inv.id)}
															disabled={sendInvoice.isPending}
														>
															{t("admin.billing.send", { defaultValue: "Send" })}
														</Button>
													)}
													{inv.status !== "paid" && inv.status !== "void" && (
														<Dialog>
															<DialogTrigger asChild>
																<Button size="sm">{t("admin.billing.recordPayment", { defaultValue: "Pay" })}</Button>
															</DialogTrigger>
															<DialogContent>
																<DialogHeader>
																	<DialogTitle>
																		{t("admin.billing.recordPayment", { defaultValue: "Record payment" })} —{" "}
																		{inv.number}
																	</DialogTitle>
																</DialogHeader>
																<div className="space-y-3">
																	<div className="grid grid-cols-2 gap-2">
																		<div className="space-y-1">
																			<Label>{t("admin.billing.amount", { defaultValue: "Amount (ETB)" })}</Label>
																			<Input
																				type="number"
																				value={paymentForm.amount}
																				onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
																			/>
																		</div>
																		<div className="space-y-1">
																			<Label>{t("admin.billing.method", { defaultValue: "Method" })}</Label>
																			<Select
																				value={paymentForm.method}
																				onValueChange={(v) => setPaymentForm((f) => ({ ...f, method: v }))}
																			>
																				<SelectTrigger>
																					<SelectValue />
																				</SelectTrigger>
																				<SelectContent>
																					{METHODS.map((m) => (
																						<SelectItem key={m} value={m}>
																							{m.replace("_", " ")}
																						</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																		</div>
																		<div className="space-y-1">
																			<Label>{t("admin.billing.receiptNo", { defaultValue: "Receipt No" })}</Label>
																			<Input
																				value={paymentForm.receiptNumber}
																				onChange={(e) =>
																					setPaymentForm((f) => ({ ...f, receiptNumber: e.target.value }))
																				}
																			/>
																		</div>
																		<div className="space-y-1">
																			<Label>{t("admin.billing.bankRef", { defaultValue: "Bank Ref" })}</Label>
																			<Input
																				value={paymentForm.bankReference}
																				onChange={(e) =>
																					setPaymentForm((f) => ({ ...f, bankReference: e.target.value }))
																				}
																			/>
																		</div>
																		<div className="space-y-1">
																			<Label>{t("admin.billing.paidAt", { defaultValue: "Paid On" })}</Label>
																			<Input
																				type="date"
																				value={paymentForm.paidAt}
																				onChange={(e) => setPaymentForm((f) => ({ ...f, paidAt: e.target.value }))}
																			/>
																		</div>
																		<div className="space-y-1">
																			<Label>{t("admin.billing.note", { defaultValue: "Note" })}</Label>
																			<Input
																				value={paymentForm.note}
																				onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
																			/>
																		</div>
																	</div>
																</div>
																<DialogFooter>
																	<Button
																		onClick={() => handleRecordPayment(inv.id)}
																		disabled={recordPayment.isPending}
																	>
																		{recordPayment.isPending
																			? t("common.saving")
																			: t("admin.billing.confirmPayment", { defaultValue: "Confirm Payment" })}
																	</Button>
																</DialogFooter>
															</DialogContent>
														</Dialog>
													)}
													{inv.status !== "paid" && inv.status !== "void" && (
														<Button
															size="sm"
															variant="ghost"
															className="text-destructive"
															onClick={() => {
																if (window.confirm(t("admin.billing.voidConfirm", { defaultValue: "Void invoice?" })))
																	voidInvoice.mutate(inv.id);
															}}
														>
															{t("admin.billing.void", { defaultValue: "Void" })}
														</Button>
													)}
												</td>
											</tr>
										))}
										{sub.invoices.length === 0 && (
											<tr>
												<td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">
													{t("admin.billing.noInvoices", { defaultValue: "No invoices" })}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="actions" className="mt-4 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.extendAction", { defaultValue: "Extend subscription" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="grid grid-cols-2 gap-2">
									<Input
										type="number"
										placeholder="days"
										value={extendDays}
										onChange={(e) => setExtendDays(e.target.value)}
									/>
									<Input
										placeholder={t("admin.billing.reason", { defaultValue: "Reason (optional)" })}
										value={extendReason}
										onChange={(e) => setExtendReason(e.target.value)}
									/>
								</div>
								<Button
									size="sm"
									onClick={() =>
										extend.mutate({ id: subscriptionId, days: Number(extendDays), reason: extendReason || undefined })
									}
									disabled={extend.isPending}
								>
									{extend.isPending ? t("common.saving") : t("admin.billing.extendBtn", { defaultValue: "Extend" })}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.manualModeAction", { defaultValue: "Manual payment mode" })}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Button
									size="sm"
									variant={sub.manualPaymentMode ? "default" : "outline"}
									onClick={() => toggleManual.mutate({ id: subscriptionId, manualMode: !sub.manualPaymentMode })}
									disabled={toggleManual.isPending}
								>
									{sub.manualPaymentMode
										? t("admin.billing.manualModeOn", { defaultValue: "Manual mode ON (click to disable)" })
										: t("admin.billing.manualModeOff", { defaultValue: "Manual mode OFF (click to enable)" })}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.creditAction", { defaultValue: "Credit / Debit account" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="grid grid-cols-2 gap-2">
									<Input
										type="number"
										placeholder={t("admin.billing.amountPositiveOrNegative", {
											defaultValue: "amount (+credit, -debit)",
										})}
										value={creditAmount}
										onChange={(e) => setCreditAmount(e.target.value)}
									/>
									<Input
										placeholder={t("admin.billing.note", { defaultValue: "Note" })}
										value={creditNote}
										onChange={(e) => setCreditNote(e.target.value)}
									/>
								</div>
								<Button
									size="sm"
									onClick={() =>
										creditAcc.mutate({
											id: subscriptionId,
											amountEtb: Number(creditAmount),
											note: creditNote || undefined,
										})
									}
									disabled={creditAcc.isPending}
								>
									{creditAcc.isPending
										? t("common.saving")
										: t("admin.billing.creditBtn", { defaultValue: "Apply Credit" })}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.changePlanAction", { defaultValue: "Change plan" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<Select value={newPlanId} onValueChange={setNewPlanId}>
									<SelectTrigger>
										<SelectValue placeholder={t("admin.billing.pickPlan", { defaultValue: "Pick a plan" })} />
									</SelectTrigger>
									<SelectContent>
										{plans.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.nameEn} — {p.slug}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									onClick={() => changePlan.mutate({ id: subscriptionId, planId: newPlanId })}
									disabled={!newPlanId || changePlan.isPending}
								>
									{changePlan.isPending
										? t("common.saving")
										: t("admin.billing.changePlanBtn", { defaultValue: "Change Plan" })}
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("admin.billing.forceStatusAction", { defaultValue: "Force status (danger)" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="grid grid-cols-2 gap-2">
									<Select value={newStatus} onValueChange={setNewStatus}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FORCE_STATUSES.map((s) => (
												<SelectItem key={s} value={s}>
													{s.replace("_", " ")}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input
										placeholder={t("admin.billing.reason", { defaultValue: "Reason" })}
										value={statusReason}
										onChange={(e) => setStatusReason(e.target.value)}
									/>
								</div>
								<Button
									size="sm"
									variant="destructive"
									onClick={() =>
										forceStatus.mutate({
											id: subscriptionId,
											status: newStatus,
											reason: statusReason || undefined,
										})
									}
									disabled={forceStatus.isPending}
								>
									{forceStatus.isPending
										? t("common.saving")
										: t("admin.billing.forceStatusBtn", { defaultValue: "Apply Status Override" })}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="dunning" className="mt-4 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Send dunning email</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex flex-wrap gap-2">
									{["reminder", "overdue", "grace", "read_only", "locked", "renewal"].map((tp) => (
										<Button
											key={tp}
											size="sm"
											variant="outline"
											disabled={sendDunning.isPending}
											onClick={() =>
												sendDunning.mutate({
													subscriptionId,
													type: tp as "reminder" | "overdue" | "grace" | "read_only" | "locked" | "renewal",
												})
											}
										>
											{sendDunning.isPending ? "..." : tp}
										</Button>
									))}
								</div>
								<p className="text-xs text-muted-foreground">
									Sends to org owner email. SMTP uses JSON transport in dev (logs instead of actual send).
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Dunning history</CardTitle>
							</CardHeader>
							<CardContent className="p-0 overflow-x-auto">
								{dunningLog.length === 0 ? (
									<p className="text-sm text-muted-foreground p-4 text-center">No dunning emails sent.</p>
								) : (
									<table className="w-full text-sm">
										<thead className="bg-muted/40">
											<tr>
												<th className="text-left p-2">When</th>
												<th className="text-left p-2">Type</th>
												<th className="text-left p-2">Subject</th>
												<th className="text-left p-2">To</th>
												<th className="text-left p-2">Status</th>
											</tr>
										</thead>
										<tbody>
											{dunningLog.map((d) => (
												<tr key={d.id} className="border-t">
													<td className="p-2">{new Date(d.sentAt).toLocaleString()}</td>
													<td className="p-2 capitalize">{d.type.replace("_", " ")}</td>
													<td className="p-2">{d.subject}</td>
													<td className="p-2 text-muted-foreground">{d.sentTo}</td>
													<td className="p-2">
														<Badge variant={d.status === "sent" ? "default" : "destructive"}>{d.status}</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="usage" className="mt-4 space-y-4">
						<UsageHistoryPanel subscriptionId={subscriptionId} />
					</TabsContent>
				</Tabs>
			</div>
		);
	},
	() => true,
);
SubscriptionDetail.displayName = "AdminSubscriptionDetail";

const UsageHistoryPanel = React.memo(
	({ subscriptionId }: { readonly subscriptionId: string }) => {
		const { data = [], isLoading } = useUsageHistory(subscriptionId);
		if (isLoading) return <Skeleton className="h-64 w-full" />;
		if (data.length === 0)
			return (
				<Card>
					<CardContent className="py-8 text-sm text-muted-foreground text-center">
						No usage snapshots yet. Cron will collect daily at 04:00.
					</CardContent>
				</Card>
			);
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Daily usage snapshots (last 90)</CardTitle>
				</CardHeader>
				<CardContent className="p-0 overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/40">
							<tr>
								<th className="text-left p-2">Date</th>
								<th className="text-right p-2">Buildings</th>
								<th className="text-right p-2">Units</th>
								<th className="text-right p-2">Users</th>
							</tr>
						</thead>
						<tbody>
							{data.map((s) => (
								<tr key={s.id} className="border-t">
									<td className="p-2">{new Date(s.snapshotDate).toLocaleDateString()}</td>
									<td className="p-2 text-right font-mono">{s.buildingCount}</td>
									<td className="p-2 text-right font-mono">{s.unitCount}</td>
									<td className="p-2 text-right font-mono">{s.userCount}</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardContent>
			</Card>
		);
	},
	(prev, next) => prev.subscriptionId === next.subscriptionId,
);
UsageHistoryPanel.displayName = "UsageHistoryPanel";

export const Route = createFileRoute("/admin/billing/$subscriptionId")({
	component: SubscriptionDetail,
});

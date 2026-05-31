import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type AdminSubscriptionDetail,
	type DunningLogEntry,
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
	useVoidInvoice,
} from "#features/admin/api/admin-billing.hooks";
import { type UsageHistorySnapshot, useUsageHistory } from "#features/admin/api/admin-billing-dashboard.hooks";
import { useAdminPlans } from "#features/admin/api/admin-plans.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const METHODS = ["manual_bank", "manual_other", "stripe_card", "chapa_telebirr", "chapa_cbe", "chapa_card"] as const;
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

const formatMinor = (amountMinor: number, currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);

type SubscriptionInvoice = AdminSubscriptionDetail["invoices"][number];

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
			amountMinor: "",
			periodStart: "",
			periodEnd: "",
			description: "",
		});
		const [paymentForm, setPaymentForm] = React.useState({
			amountMinor: "",
			method: "manual_bank",
			receiptNumber: "",
			bankReference: "",
			note: "",
			paidAt: new Date().toISOString().slice(0, 10),
			forInvoiceId: "",
		});
		const [paymentDialogInvoiceId, setPaymentDialogInvoiceId] = React.useState<string | null>(null);

		const handleCreateInvoice = React.useCallback(async () => {
			if (!invoiceForm.amountMinor || !invoiceForm.periodStart || !invoiceForm.periodEnd) return;
			await createInvoice.mutateAsync({
				subscriptionId,
				amountMinor: Number(invoiceForm.amountMinor),
				periodStart: invoiceForm.periodStart,
				periodEnd: invoiceForm.periodEnd,
				description: invoiceForm.description || undefined,
			});
			setInvoiceForm({ amountMinor: "", periodStart: "", periodEnd: "", description: "" });
		}, [invoiceForm, createInvoice, subscriptionId]);

		const handleRecordPayment = React.useCallback(
			async (invoiceId: string) => {
				if (!paymentForm.amountMinor) return;
				await recordPayment.mutateAsync({
					invoiceId,
					amountMinor: Number(paymentForm.amountMinor),
					method: paymentForm.method,
					receiptNumber: paymentForm.receiptNumber || undefined,
					bankReference: paymentForm.bankReference || undefined,
					note: paymentForm.note || undefined,
					paidAt: paymentForm.paidAt,
				});
				setPaymentForm({
					amountMinor: "",
					method: "manual_bank",
					receiptNumber: "",
					bankReference: "",
					note: "",
					paidAt: new Date().toISOString().slice(0, 10),
					forInvoiceId: "",
				});
				setPaymentDialogInvoiceId(null);
			},
			[paymentForm, recordPayment],
		);

		const invoiceColumns = React.useMemo<ColumnDef<SubscriptionInvoice>[]>(
			() => [
				{
					accessorKey: "number",
					header: t("admin.billing.col.number", { defaultValue: "Number" }),
					cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
					meta: { filter: { type: "text" } },
				},
				{
					accessorKey: "status",
					header: t("admin.billing.col.status", { defaultValue: "Status" }),
					cell: ({ row }) => (
						<Badge variant="outline" className="capitalize text-xs">
							{row.original.status}
						</Badge>
					),
					meta: {
						filter: {
							type: "select",
							options: [
								{ value: "draft", label: "Draft" },
								{ value: "sent", label: "Sent" },
								{ value: "paid", label: "Paid" },
								{ value: "overdue", label: "Overdue" },
								{ value: "void", label: "Void" },
							],
						},
					},
				},
				{
					accessorKey: "dueDate",
					header: t("admin.billing.col.due", { defaultValue: "Due" }),
					cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString(),
					meta: { filter: { type: "date-range" } },
				},
				{
					accessorKey: "totalMinor",
					header: t("admin.billing.col.total", { defaultValue: "Total" }),
					cell: ({ row }) => (
						<span className="font-mono">{formatMinor(row.original.totalMinor, row.original.currency)}</span>
					),
					meta: { className: "text-right", headerClassName: "text-right", filter: { type: "number-range" } },
				},
				{
					accessorKey: "amountPaidMinor",
					header: t("admin.billing.col.paid", { defaultValue: "Paid" }),
					cell: ({ row }) => (
						<span className="font-mono">{formatMinor(row.original.amountPaidMinor, row.original.currency)}</span>
					),
					meta: { className: "text-right", headerClassName: "text-right", filter: { type: "number-range" } },
				},
				{
					id: "actions",
					header: t("common.actions"),
					enableSorting: false,
					enableColumnFilter: false,
					cell: ({ row }) => {
						const inv = row.original;
						return (
							<div className="flex flex-wrap justify-end gap-1">
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
									<Dialog
										open={paymentDialogInvoiceId === inv.id}
										onOpenChange={(open) => setPaymentDialogInvoiceId(open ? inv.id : null)}
									>
										<DialogTrigger asChild>
											<Button size="sm">{t("admin.billing.recordPayment", { defaultValue: "Pay" })}</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>
													{t("admin.billing.recordPayment", { defaultValue: "Record payment" })} - {inv.number}
												</DialogTitle>
											</DialogHeader>
											<div className="space-y-3">
												<div className="grid grid-cols-2 gap-2">
													<div className="space-y-1">
														<Label htmlFor={`payment-amount-${inv.id}`}>
															{t("admin.billing.amountMinor", { defaultValue: "Amount (minor units)" })}
														</Label>
														<Input
															id={`payment-amount-${inv.id}`}
															type="number"
															value={paymentForm.amountMinor}
															onChange={(e) => setPaymentForm((f) => ({ ...f, amountMinor: e.target.value }))}
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
														<Label htmlFor={`payment-receipt-${inv.id}`}>
															{t("admin.billing.receiptNo", { defaultValue: "Receipt No" })}
														</Label>
														<Input
															id={`payment-receipt-${inv.id}`}
															value={paymentForm.receiptNumber}
															onChange={(e) => setPaymentForm((f) => ({ ...f, receiptNumber: e.target.value }))}
														/>
													</div>
													<div className="space-y-1">
														<Label>{t("admin.billing.bankRef", { defaultValue: "Bank Ref" })}</Label>
														<Input
															value={paymentForm.bankReference}
															onChange={(e) => setPaymentForm((f) => ({ ...f, bankReference: e.target.value }))}
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
												<Button onClick={() => handleRecordPayment(inv.id)} disabled={recordPayment.isPending}>
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
							</div>
						);
					},
					meta: { className: "text-right", headerClassName: "text-right" },
				},
			],
			[handleRecordPayment, paymentDialogInvoiceId, paymentForm, recordPayment.isPending, sendInvoice, t, voidInvoice],
		);

		const dunningColumns = React.useMemo<ColumnDef<DunningLogEntry>[]>(
			() => [
				{
					accessorKey: "sentAt",
					header: "When",
					cell: ({ row }) => new Date(row.original.sentAt).toLocaleString(),
					meta: { filter: { type: "date-range" } },
				},
				{
					accessorKey: "type",
					header: "Type",
					cell: ({ row }) => <span className="capitalize">{row.original.type.replace("_", " ")}</span>,
					meta: {
						filter: {
							type: "select",
							options: [
								{ value: "reminder", label: "Reminder" },
								{ value: "overdue", label: "Overdue" },
								{ value: "grace", label: "Grace" },
								{ value: "read_only", label: "Read only" },
								{ value: "locked", label: "Locked" },
								{ value: "renewal", label: "Renewal" },
							],
						},
					},
				},
				{ accessorKey: "subject", header: "Subject", meta: { filter: { type: "text" } } },
				{ accessorKey: "sentTo", header: "To", meta: { filter: { type: "text" } } },
				{
					accessorKey: "status",
					header: "Status",
					cell: ({ row }) => (
						<Badge variant={row.original.status === "sent" ? "default" : "destructive"}>{row.original.status}</Badge>
					),
					meta: {
						filter: {
							type: "select",
							options: [
								{ value: "sent", label: "Sent" },
								{ value: "failed", label: "Failed" },
							],
						},
					},
				},
			],
			[],
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
							<div className="text-lg font-semibold font-mono">{formatMinor(sub.creditBalanceMinor, sub.currency)}</div>
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
									{t("admin.billing.createManualInvoice", { defaultValue: "Create manual invoice" })}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
									<div className="space-y-1">
										<Label htmlFor="manual-invoice-amount">
											{t("admin.billing.amountMinor", { defaultValue: "Amount (minor units, excl. tax)" })}
										</Label>
										<Input
											id="manual-invoice-amount"
											type="number"
											value={invoiceForm.amountMinor}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, amountMinor: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="manual-invoice-period-start">
											{t("admin.billing.periodStart", { defaultValue: "Period Start" })}
										</Label>
										<Input
											id="manual-invoice-period-start"
											type="date"
											value={invoiceForm.periodStart}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, periodStart: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="manual-invoice-period-end">
											{t("admin.billing.periodEndLbl", { defaultValue: "Period End" })}
										</Label>
										<Input
											id="manual-invoice-period-end"
											type="date"
											value={invoiceForm.periodEnd}
											onChange={(e) => setInvoiceForm((f) => ({ ...f, periodEnd: e.target.value }))}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="manual-invoice-description">
											{t("admin.billing.description", { defaultValue: "Description" })}
										</Label>
										<Input
											id="manual-invoice-description"
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
							<CardHeader>
								<CardTitle className="text-base" role="heading" aria-level={2}>
									{t("admin.billing.tab.invoices", { defaultValue: "Invoices" })}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<DataTable
									columns={invoiceColumns}
									data={sub.invoices}
									searchPlaceholder="Search invoices..."
									emptyTitle={t("admin.billing.noInvoices", { defaultValue: "No invoices" })}
									emptyMessage="Create a manual invoice or wait for the billing lifecycle job to generate one."
									pageSize={10}
									enableCsvExport
									exportFilename={`subscription-${subscriptionId}-invoices.csv`}
									savedViewsEntity={`admin-subscription-${subscriptionId}-invoices`}
									getRowId={(invoice) => invoice.id}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="actions" className="mt-4 space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base" role="heading" aria-level={2}>
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
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
											amountMinor: Number(creditAmount),
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
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
												{p.nameEn} - {p.slug}
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
									Send dunning email
								</CardTitle>
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
								<CardTitle className="text-base" role="heading" aria-level={2}>
									Dunning history
								</CardTitle>
							</CardHeader>
							<CardContent>
								<DataTable
									columns={dunningColumns}
									data={dunningLog}
									searchPlaceholder="Search dunning history..."
									emptyTitle="No dunning emails sent"
									emptyMessage="Send a reminder or lifecycle email to create the first dunning record."
									pageSize={10}
									enableCsvExport
									exportFilename={`subscription-${subscriptionId}-dunning.csv`}
									savedViewsEntity={`admin-subscription-${subscriptionId}-dunning`}
									getRowId={(entry) => entry.id}
								/>
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
		const usageColumns = React.useMemo<ColumnDef<UsageHistorySnapshot>[]>(
			() => [
				{
					accessorKey: "snapshotDate",
					header: "Date",
					cell: ({ row }) => new Date(row.original.snapshotDate).toLocaleDateString(),
					meta: { filter: { type: "date-range" } },
				},
				{
					accessorKey: "userCount",
					header: "Users",
					cell: ({ row }) => <span className="font-mono">{row.original.userCount}</span>,
					meta: { className: "text-right", headerClassName: "text-right", filter: { type: "number-range" } },
				},
				{
					accessorKey: "apiCallCount",
					header: "API calls",
					cell: ({ row }) => <span className="font-mono">{row.original.apiCallCount}</span>,
					meta: { className: "text-right", headerClassName: "text-right", filter: { type: "number-range" } },
				},
				{
					accessorKey: "emailCount",
					header: "Emails",
					cell: ({ row }) => <span className="font-mono">{row.original.emailCount}</span>,
					meta: { className: "text-right", headerClassName: "text-right", filter: { type: "number-range" } },
				},
				{
					accessorKey: "metricsJson",
					header: "Metrics",
					cell: ({ row }) => (
						<span className="text-xs text-muted-foreground">
							{row.original.metricsJson ? JSON.stringify(row.original.metricsJson) : "None"}
						</span>
					),
					enableSorting: false,
					meta: { filter: { type: "text" } },
				},
			],
			[],
		);
		if (isLoading) return <Skeleton className="h-64 w-full" />;
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base" role="heading" aria-level={2}>
						Daily usage snapshots (last 90)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={usageColumns}
						data={data}
						searchPlaceholder="Search usage snapshots..."
						emptyTitle="No usage snapshots yet"
						emptyMessage="The usage cron collects daily snapshots at 04:00."
						pageSize={10}
						enableCsvExport
						exportFilename={`subscription-${subscriptionId}-usage.csv`}
						savedViewsEntity={`admin-subscription-${subscriptionId}-usage`}
						getRowId={(snapshot) => snapshot.id}
					/>
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

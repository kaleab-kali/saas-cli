import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import {
	ChangeSubscriptionPlanHandler,
	CreditAccountHandler,
	ExtendTrialHandler,
	ForceSubscriptionStatusHandler,
	SetManualPaymentModeHandler,
} from "#modules/admin/application/commands/admin-billing.handlers";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { DunningService, type DunningType } from "#modules/billing/application/services/dunning.service";
import {
	InvoiceLifecycleService,
	type ManualInvoiceInput,
	type ManualPaymentInput,
} from "#modules/billing/application/services/invoice-lifecycle.service";
import { SubscriptionLifecycleService } from "#modules/billing/application/services/subscription-lifecycle.service";
import { PrismaService } from "#shared/database/prisma.service";

interface AdminReq {
	adminUser?: { id: string };
}

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/billing")
@UseGuards(SuperAdminGuard)
export class AdminBillingController {
	constructor(
		private readonly prisma: PrismaService,
		private readonly invoiceLifecycle: InvoiceLifecycleService,
		private readonly subLifecycle: SubscriptionLifecycleService,
		private readonly extendTrial: ExtendTrialHandler,
		private readonly setManualMode: SetManualPaymentModeHandler,
		private readonly credit: CreditAccountHandler,
		private readonly changePlan: ChangeSubscriptionPlanHandler,
		private readonly forceStatus: ForceSubscriptionStatusHandler,
		private readonly dunning: DunningService,
	) {}

	@Post("subscriptions/:id/dunning")
	@ApiOperation({ summary: "Manually trigger a dunning email (reminder/overdue/grace/read_only/locked/renewal)" })
	async sendDunning(
		@Param("id") id: string,
		@Body() body: { type: DunningType; invoiceId?: string; daysOffset?: number },
	) {
		const result = await this.dunning.send({
			subscriptionId: id,
			type: body.type,
			invoiceId: body.invoiceId,
			daysOffset: body.daysOffset,
		});
		return { data: result };
	}

	@Get("subscriptions/:id/dunning-log")
	@ApiOperation({ summary: "Dunning email history for subscription" })
	async dunningLog(@Param("id") id: string) {
		return {
			data: await this.prisma.dunningEmail.findMany({
				where: { subscriptionId: id },
				orderBy: { sentAt: "desc" },
				take: 50,
			}),
		};
	}

	@Get("dashboard/revenue-trend")
	@ApiOperation({ summary: "Monthly paid revenue for last 12 months" })
	async revenueTrend() {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
		const rows = await this.prisma.subscriptionInvoice.findMany({
			where: { status: "paid", paidAt: { gte: start } },
			select: { paidAt: true, total: true },
		});
		const buckets = new Map<string, number>();
		for (let i = 0; i < 12; i++) {
			const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			buckets.set(key, 0);
		}
		for (const r of rows) {
			if (!r.paidAt) continue;
			const key = `${r.paidAt.getFullYear()}-${String(r.paidAt.getMonth() + 1).padStart(2, "0")}`;
			buckets.set(key, (buckets.get(key) ?? 0) + r.total);
		}
		return {
			data: Array.from(buckets.entries()).map(([month, revenueEtb]) => ({
				month,
				revenueEtb: Math.round(revenueEtb),
			})),
		};
	}

	@Get("dashboard/past-due")
	@ApiOperation({ summary: "Top past-due invoices" })
	async pastDue(@Query("limit") limit?: string) {
		const n = Math.max(1, Math.min(100, Number(limit) || 25));
		const now = new Date();
		const rows = await this.prisma.subscriptionInvoice.findMany({
			where: {
				status: { in: ["sent", "overdue", "partial"] },
				dueDate: { lt: now },
			},
			orderBy: { dueDate: "asc" },
			take: n,
		});
		const orgIds = Array.from(new Set(rows.map((r) => r.organizationId)));
		const orgs = await this.prisma.organization.findMany({
			where: { id: { in: orgIds } },
			select: { id: true, name: true },
		});
		const byId = new Map(orgs.map((o) => [o.id, o.name] as const));
		return {
			data: rows.map((r) => ({
				id: r.id,
				number: r.number,
				subscriptionId: r.subscriptionId,
				organizationId: r.organizationId,
				organizationName: byId.get(r.organizationId) ?? null,
				dueDate: r.dueDate,
				total: r.total,
				amountPaid: r.amountPaid,
				currency: r.currency,
				daysPastDue: Math.floor((now.getTime() - r.dueDate.getTime()) / 86_400_000),
			})),
		};
	}

	@Get("dashboard/pending-verification")
	@ApiOperation({ summary: "Manual payments awaiting admin verification" })
	async pendingVerification() {
		const payments = await this.prisma.subscriptionPayment.findMany({
			where: { verified: false },
			orderBy: { paidAt: "desc" },
			take: 50,
			include: { invoice: { select: { number: true } } },
		});
		const orgIds = Array.from(new Set(payments.map((p) => p.organizationId)));
		const orgs = await this.prisma.organization.findMany({
			where: { id: { in: orgIds } },
			select: { id: true, name: true },
		});
		const byId = new Map(orgs.map((o) => [o.id, o.name] as const));
		return {
			data: payments.map((p) => ({
				id: p.id,
				invoiceId: p.invoiceId,
				invoiceNumber: p.invoice?.number ?? null,
				organizationId: p.organizationId,
				organizationName: byId.get(p.organizationId) ?? null,
				amount: p.amount,
				currency: p.currency,
				method: p.method,
				receiptNumber: p.receiptNumber,
				bankReference: p.bankReference,
				paidAt: p.paidAt,
				note: p.note,
			})),
		};
	}

	@Post("payments/:paymentId/verify")
	@ApiOperation({ summary: "Verify a pending manual payment" })
	async verifyPayment(@Param("paymentId") id: string, @Req() req: AdminReq) {
		await this.prisma.subscriptionPayment.update({
			where: { id },
			data: { verified: true, verifiedAt: new Date(), verifiedByUserId: req.adminUser?.id },
		});
		return { data: { ok: true } };
	}

	@Get("subscriptions/:id/usage-history")
	@ApiOperation({ summary: "Usage snapshots for subscription (last 90)" })
	async usageHistory(@Param("id") id: string) {
		const snapshots = await this.prisma.usageSnapshot.findMany({
			where: { subscriptionId: id },
			orderBy: { snapshotDate: "desc" },
			take: 90,
		});
		return { data: snapshots };
	}

	@Get("dashboard")
	@ApiOperation({ summary: "Platform-wide billing KPIs" })
	async dashboard() {
		const now = new Date();
		const start30 = new Date(now.getTime() - 30 * 86_400_000);
		const [subsAll, invoicesThisMonth, subsByStatus, unpaid] = await Promise.all([
			this.prisma.subscription.findMany({ include: { plan: true } }),
			this.prisma.subscriptionInvoice.findMany({
				where: { issueDate: { gte: start30 } },
			}),
			this.prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
			this.prisma.subscriptionInvoice.findMany({
				where: { status: { in: ["sent", "overdue", "partial"] } },
			}),
		]);

		const mrr = subsAll
			.filter(
				(s) =>
					s.status === "active" ||
					s.status === "trialing" ||
					s.status === "past_due" ||
					s.status === "grace" ||
					s.status === "read_only",
			)
			.reduce((sum, s) => {
				const price = s.billingInterval === "annual" ? s.plan.priceAnnualEtb / 12 : s.plan.priceMonthlyEtb;
				return sum + price;
			}, 0);
		const arr = mrr * 12;

		const outstanding = unpaid.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
		const paidLast30 = invoicesThisMonth.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);

		const counts: Record<string, number> = {};
		for (const row of subsByStatus) counts[row.status] = row._count._all;

		const upcomingRenewals = subsAll.filter((s) => {
			const daysLeft = Math.floor((s.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000);
			return (s.status === "active" || s.status === "trialing") && daysLeft >= 0 && daysLeft <= 30;
		}).length;

		const byPlan: Record<string, { count: number; mrrEtb: number }> = {};
		for (const s of subsAll) {
			const key = s.plan.slug;
			if (!byPlan[key]) byPlan[key] = { count: 0, mrrEtb: 0 };
			byPlan[key].count += 1;
			if (s.status === "active" || s.status === "trialing") {
				const price = s.billingInterval === "annual" ? s.plan.priceAnnualEtb / 12 : s.plan.priceMonthlyEtb;
				byPlan[key].mrrEtb += price;
			}
		}

		return {
			data: {
				mrrEtb: Math.round(mrr),
				arrEtb: Math.round(arr),
				outstandingEtb: Math.round(outstanding),
				paidLast30Etb: Math.round(paidLast30),
				countsByStatus: counts,
				upcomingRenewals30d: upcomingRenewals,
				byPlan,
				totalSubs: subsAll.length,
			},
		};
	}

	// ---- Subscription overview ----
	@Get("subscriptions")
	@ApiOperation({ summary: "List all subscriptions across orgs" })
	async listSubs(@Query("status") status?: string) {
		const subs = await this.prisma.subscription.findMany({
			where: status ? { status } : undefined,
			include: { plan: true },
			orderBy: { updatedAt: "desc" },
		});
		const orgIds = subs.map((s) => s.organizationId);
		const orgs = await this.prisma.organization.findMany({
			where: { id: { in: orgIds } },
			select: { id: true, name: true, slug: true },
		});
		const byId = new Map(orgs.map((o) => [o.id, o] as const));
		return {
			data: subs.map((s) => ({
				...s,
				organizationName: byId.get(s.organizationId)?.name ?? null,
				organizationSlug: byId.get(s.organizationId)?.slug ?? null,
			})),
		};
	}

	@Get("subscriptions/:id")
	@ApiOperation({ summary: "Subscription detail" })
	async getSub(@Param("id") id: string) {
		const sub = await this.prisma.subscription.findUnique({
			where: { id },
			include: {
				plan: { include: { entitlements: true } },
				invoices: { include: { payments: true }, orderBy: { issueDate: "desc" } },
				campaigns: { orderBy: { createdAt: "desc" } },
				usageSnapshots: { orderBy: { snapshotDate: "desc" }, take: 30 },
				dunningEmails: { orderBy: { sentAt: "desc" }, take: 20 },
			},
		});
		if (!sub) return { data: null };
		const org = await this.prisma.organization.findUnique({
			where: { id: sub.organizationId },
			select: { id: true, name: true, slug: true },
		});
		const snap = await this.subLifecycle.snapshot(sub.organizationId);
		return { data: { ...sub, organization: org, lifecycle: snap } };
	}

	@Get("subscriptions/:id/snapshot")
	@ApiOperation({ summary: "Get lifecycle snapshot for subscription" })
	async snapshot(@Param("id") id: string) {
		const sub = await this.prisma.subscription.findUnique({ where: { id } });
		if (!sub) return { data: null };
		return { data: await this.subLifecycle.snapshot(sub.organizationId) };
	}

	// ---- Invoice management (admin) ----
	@Post("subscriptions/:id/invoices")
	@ApiOperation({ summary: "Manually create an invoice for a subscription" })
	async createInvoice(@Param("id") subscriptionId: string, @Body() body: Omit<ManualInvoiceInput, "subscriptionId">) {
		const inv = await this.invoiceLifecycle.createManualInvoice({
			...body,
			subscriptionId,
			periodStart: new Date(body.periodStart),
			periodEnd: new Date(body.periodEnd),
			dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
		});
		return { data: inv };
	}

	@Put("invoices/:invoiceId/send")
	@ApiOperation({ summary: "Mark invoice as sent" })
	async sendInvoice(@Param("invoiceId") id: string) {
		return { data: await this.invoiceLifecycle.markSent(id) };
	}

	@Put("invoices/:invoiceId/void")
	@ApiOperation({ summary: "Void invoice" })
	async voidInvoice(@Param("invoiceId") id: string) {
		return { data: await this.invoiceLifecycle.voidInvoice(id) };
	}

	@Post("invoices/:invoiceId/payments")
	@ApiOperation({ summary: "Record manual payment against invoice (state restore on full payment)" })
	async recordPayment(
		@Param("invoiceId") invoiceId: string,
		@Body() body: Omit<ManualPaymentInput, "invoiceId">,
		@Req() req: AdminReq,
	) {
		const result = await this.invoiceLifecycle.recordManualPayment({
			...body,
			invoiceId,
			paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
			recordedByUserId: req.adminUser?.id,
			verified: body.verified ?? true,
		});
		return { data: result };
	}

	@Post("payments/:paymentId/refund")
	@ApiOperation({ summary: "Refund a payment" })
	async refundPayment(@Param("paymentId") id: string, @Body() body: { reason?: string }) {
		return { data: await this.invoiceLifecycle.refundPayment(id, body.reason) };
	}

	// ---- Subscription actions ----
	@Post("subscriptions/:id/extend")
	@ApiOperation({ summary: "Extend subscription period" })
	async extend(@Param("id") id: string, @Body() body: { days: number; reason?: string }, @Req() req: AdminReq) {
		return { data: await this.extendTrial.execute(id, body.days, req.adminUser?.id, body.reason) };
	}

	@Put("subscriptions/:id/manual-mode")
	@ApiOperation({ summary: "Toggle manual payment mode" })
	async toggleManual(@Param("id") id: string, @Body() body: { manualMode: boolean }, @Req() req: AdminReq) {
		return { data: await this.setManualMode.execute(id, body.manualMode, req.adminUser?.id) };
	}

	@Post("subscriptions/:id/credit")
	@ApiOperation({ summary: "Credit/debit org account in ETB" })
	async creditAccount(
		@Param("id") id: string,
		@Body() body: { amountEtb: number; note?: string },
		@Req() req: AdminReq,
	) {
		return { data: await this.credit.execute(id, body.amountEtb, req.adminUser?.id, body.note) };
	}

	@Put("subscriptions/:id/plan")
	@ApiOperation({ summary: "Change subscription plan" })
	async change(@Param("id") id: string, @Body() body: { planId: string; note?: string }, @Req() req: AdminReq) {
		return { data: await this.changePlan.execute(id, body.planId, req.adminUser?.id, body.note) };
	}

	@Put("subscriptions/:id/status")
	@ApiOperation({ summary: "Force subscription status (admin override)" })
	async force(@Param("id") id: string, @Body() body: { status: string; reason?: string }, @Req() req: AdminReq) {
		return { data: await this.forceStatus.execute(id, body.status, req.adminUser?.id, body.reason) };
	}
}

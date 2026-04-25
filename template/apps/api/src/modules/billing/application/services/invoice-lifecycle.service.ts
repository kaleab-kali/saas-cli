import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { PrismaService } from "#shared/database/prisma.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";

interface RenewalInput {
	subscriptionId: string;
	organizationId: string;
	amountMinor: number;
	currency: string;
	periodStart: Date;
	billingInterval: string;
}

export interface ManualInvoiceInput {
	subscriptionId: string;
	amountMinor: number;
	periodStart: Date;
	periodEnd: Date;
	description?: string;
	lineType?: string;
	dueDate?: Date;
}

export interface ManualPaymentInput {
	invoiceId: string;
	amountMinor: number;
	method: string;
	paidAt?: Date;
	chapaTxRef?: string;
	chapaRefId?: string;
	stripePaymentIntentId?: string;
	bankReference?: string;
	receiptNumber?: string;
	note?: string;
	recordedByUserId?: string;
	verified?: boolean;
}

@Injectable()
export class InvoiceLifecycleService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly settings: PlatformSettingsService,
		private readonly lifecycle: SubscriptionLifecycleService,
	) {}

	async nextInvoiceNumber(organizationId: string): Promise<string> {
		const prefix = await this.settings.getString("billing.invoicePrefix", "INV");
		const yearReset = await this.settings.getBool("billing.invoiceYearReset", true);
		const now = new Date();
		const year = now.getFullYear();
		const scopePrefix = yearReset ? `${prefix}-${year}-` : `${prefix}-`;
		const latest = await this.prisma.subscriptionInvoice.findFirst({
			where: { organizationId, number: { startsWith: scopePrefix } },
			orderBy: { number: "desc" },
		});
		let next = 1;
		if (latest) {
			const tail = latest.number.slice(scopePrefix.length);
			const n = Number(tail);
			if (Number.isFinite(n)) next = n + 1;
		}
		return `${scopePrefix}${String(next).padStart(5, "0")}`;
	}

	private async computeTotals(subtotalMinor: number, organizationId: string) {
		const orgSettings = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
			select: { taxRatePct: true },
		});
		const taxRatePct = orgSettings?.taxRatePct ?? 0;
		const taxMinor = Math.round(subtotalMinor * (taxRatePct / 100));
		const totalMinor = subtotalMinor + taxMinor;
		return { taxMinor, totalMinor, taxRatePct };
	}

	async createRenewalInvoice(input: RenewalInput) {
		const dueDays = await this.settings.getNumber("billing.paymentDueDays", 7);
		const sub = await this.prisma.subscription.findUnique({ where: { id: input.subscriptionId } });
		if (!sub) throw new NotFoundException("subscription not found");
		const periodEnd = new Date(input.periodStart);
		periodEnd.setMonth(periodEnd.getMonth() + (input.billingInterval === "annual" ? 12 : 1));
		const issueDate = new Date();
		const dueDate = new Date(issueDate.getTime() + dueDays * 86_400_000);
		const { taxMinor, totalMinor } = await this.computeTotals(input.amountMinor, input.organizationId);
		const number = await this.nextInvoiceNumber(input.organizationId);
		return this.prisma.subscriptionInvoice.create({
			data: {
				subscriptionId: sub.id,
				organizationId: input.organizationId,
				number,
				status: "sent",
				issueDate,
				dueDate,
				periodStart: input.periodStart,
				periodEnd,
				currency: input.currency || sub.currency,
				subtotalMinor: input.amountMinor,
				taxMinor,
				totalMinor,
				amountPaidMinor: 0,
				lineType: "subscription",
				description: `Renewal — ${input.billingInterval}`,
				sentAt: issueDate,
			},
		});
	}

	async createManualInvoice(input: ManualInvoiceInput) {
		const sub = await this.prisma.subscription.findUnique({ where: { id: input.subscriptionId } });
		if (!sub) throw new NotFoundException("subscription not found");
		const dueDays = await this.settings.getNumber("billing.paymentDueDays", 7);
		const issueDate = new Date();
		const dueDate = input.dueDate ?? new Date(issueDate.getTime() + dueDays * 86_400_000);
		const { taxMinor, totalMinor } = await this.computeTotals(input.amountMinor, sub.organizationId);
		const number = await this.nextInvoiceNumber(sub.organizationId);
		return this.prisma.subscriptionInvoice.create({
			data: {
				subscriptionId: sub.id,
				organizationId: sub.organizationId,
				number,
				status: "draft",
				issueDate,
				dueDate,
				periodStart: input.periodStart,
				periodEnd: input.periodEnd,
				currency: sub.currency,
				subtotalMinor: input.amountMinor,
				taxMinor,
				totalMinor,
				amountPaidMinor: 0,
				lineType: input.lineType ?? "subscription",
				description: input.description ?? null,
			},
		});
	}

	async voidInvoice(invoiceId: string) {
		const inv = await this.prisma.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
		if (!inv) throw new NotFoundException("invoice not found");
		if (inv.status === "paid") throw new BadRequestException("cannot void a paid invoice — issue refund");
		return this.prisma.subscriptionInvoice.update({
			where: { id: invoiceId },
			data: { status: "void" },
		});
	}

	async markSent(invoiceId: string) {
		return this.prisma.subscriptionInvoice.update({
			where: { id: invoiceId },
			data: { status: "sent", sentAt: new Date() },
		});
	}

	async recordManualPayment(input: ManualPaymentInput) {
		const inv = await this.prisma.subscriptionInvoice.findUnique({
			where: { id: input.invoiceId },
			include: { subscription: true },
		});
		if (!inv) throw new NotFoundException("invoice not found");
		if (inv.status === "void") throw new BadRequestException("cannot pay void invoice");
		if (input.amountMinor <= 0) throw new BadRequestException("amount must be positive");

		const payment = await this.prisma.subscriptionPayment.create({
			data: {
				invoiceId: inv.id,
				organizationId: inv.organizationId,
				amountMinor: input.amountMinor,
				currency: inv.currency,
				method: input.method,
				stripePaymentIntentId: input.stripePaymentIntentId,
				chapaTxRef: input.chapaTxRef,
				chapaRefId: input.chapaRefId,
				bankReference: input.bankReference,
				receiptNumber: input.receiptNumber,
				paidAt: input.paidAt ?? new Date(),
				recordedByUserId: input.recordedByUserId,
				verified: input.verified ?? true,
				verifiedByUserId: input.verified ? input.recordedByUserId : undefined,
				verifiedAt: input.verified ? new Date() : undefined,
				note: input.note,
			},
		});

		const newAmountPaid = inv.amountPaidMinor + input.amountMinor;
		const fullyPaid = newAmountPaid >= inv.totalMinor;
		const updatedInv = await this.prisma.subscriptionInvoice.update({
			where: { id: inv.id },
			data: {
				amountPaidMinor: newAmountPaid,
				status: fullyPaid ? "paid" : "sent",
				paidAt: fullyPaid ? new Date() : inv.paidAt,
			},
		});

		if (fullyPaid) {
			await this.lifecycle.restoreAfterPayment(inv.subscriptionId);
		}
		return { payment, invoice: updatedInv, fullyPaid };
	}

	async refundPayment(paymentId: string, reason?: string) {
		const pay = await this.prisma.subscriptionPayment.findUnique({ where: { id: paymentId } });
		if (!pay) throw new NotFoundException("payment not found");
		const inv = await this.prisma.subscriptionInvoice.findUnique({ where: { id: pay.invoiceId } });
		if (!inv) throw new NotFoundException("invoice not found");
		await this.prisma.subscriptionPayment.update({
			where: { id: paymentId },
			data: { note: `REFUNDED${reason ? `: ${reason}` : ""}` },
		});
		const newAmountPaid = Math.max(0, inv.amountPaidMinor - pay.amountMinor);
		return this.prisma.subscriptionInvoice.update({
			where: { id: inv.id },
			data: {
				amountPaidMinor: newAmountPaid,
				status: newAmountPaid >= inv.totalMinor ? "paid" : "refunded",
			},
		});
	}
}

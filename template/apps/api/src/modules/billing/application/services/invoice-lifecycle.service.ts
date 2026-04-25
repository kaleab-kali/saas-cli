import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { PrismaService } from "#shared/database/prisma.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";

interface RenewalInput {
	subscriptionId: string;
	organizationId: string;
	amountEtb: number;
	periodStart: Date;
	billingInterval: string;
}

export interface ManualInvoiceInput {
	subscriptionId: string;
	amountEtb: number;
	periodStart: Date;
	periodEnd: Date;
	description?: string;
	lineType?: string;
	dueDate?: Date;
}

export interface ManualPaymentInput {
	invoiceId: string;
	amount: number;
	method: string;
	paidAt?: Date;
	chapaReference?: string;
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
		const prefix = await this.settings.getString("billing.invoicePrefix", "PF-INV");
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

	private async computeTotals(subtotalEtb: number) {
		const vatEnabled = await this.settings.getBool("billing.vatEnabled", true);
		const vatRatePct = await this.settings.getNumber("billing.vatRate", 15);
		const vatAmount = vatEnabled ? (subtotalEtb * vatRatePct) / 100 : 0;
		const total = subtotalEtb + vatAmount;
		return { vatAmount, total, vatRatePct };
	}

	async createRenewalInvoice(input: RenewalInput) {
		const dueDays = await this.settings.getNumber("billing.paymentDueDays", 7);
		const sub = await this.prisma.subscription.findUnique({ where: { id: input.subscriptionId } });
		if (!sub) throw new NotFoundException("subscription not found");
		const periodEnd = new Date(input.periodStart);
		periodEnd.setMonth(periodEnd.getMonth() + (input.billingInterval === "annual" ? 12 : 1));
		const issueDate = new Date();
		const dueDate = new Date(issueDate.getTime() + dueDays * 86_400_000);
		const { vatAmount, total } = await this.computeTotals(input.amountEtb);
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
				currency: sub.currency,
				subtotal: input.amountEtb,
				vatAmount,
				total,
				amountPaid: 0,
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
		const { vatAmount, total } = await this.computeTotals(input.amountEtb);
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
				subtotal: input.amountEtb,
				vatAmount,
				total,
				amountPaid: 0,
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
		if (input.amount <= 0) throw new BadRequestException("amount must be positive");

		const payment = await this.prisma.subscriptionPayment.create({
			data: {
				invoiceId: inv.id,
				organizationId: inv.organizationId,
				amount: input.amount,
				currency: inv.currency,
				method: input.method,
				chapaReference: input.chapaReference,
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

		const newAmountPaid = inv.amountPaid + input.amount;
		const fullyPaid = newAmountPaid >= inv.total;
		const updatedInv = await this.prisma.subscriptionInvoice.update({
			where: { id: inv.id },
			data: {
				amountPaid: newAmountPaid,
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
		const newAmountPaid = Math.max(0, inv.amountPaid - pay.amount);
		return this.prisma.subscriptionInvoice.update({
			where: { id: inv.id },
			data: {
				amountPaid: newAmountPaid,
				status: newAmountPaid >= inv.total ? "paid" : "refunded",
			},
		});
	}
}

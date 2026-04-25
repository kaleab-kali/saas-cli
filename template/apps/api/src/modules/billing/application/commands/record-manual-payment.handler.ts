import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { SubscriptionPayment } from "../../domain/entities/subscription-payment.entity";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import { SubscriptionPaymentRepository } from "../../domain/repositories/subscription-payment.repository";
import type { PaymentMethod } from "../../domain/value-objects/feature-keys.vo";
import type { RecordManualPaymentDto } from "../dto/billing.dto";

@Injectable()
export class RecordManualPaymentHandler {
	constructor(
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly paymentRepo: SubscriptionPaymentRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, userId: string, dto: RecordManualPaymentDto) {
		if (!dto.method.startsWith("manual_")) throw new BadRequestException("use chapa endpoint for online");
		const invoice = await this.invoiceRepo.findById(dto.invoiceId);
		if (!invoice || invoice.toPrimitives().organizationId !== organizationId) {
			throw new NotFoundException("invoice");
		}
		if (invoice.status === "paid") throw new ConflictException("invoice already paid");
		if (invoice.status === "void") throw new ConflictException("invoice void");

		const now = dto.paidAt ? new Date(dto.paidAt) : new Date();
		const payment = SubscriptionPayment.create({
			id: "",
			invoiceId: dto.invoiceId,
			organizationId,
			amount: dto.amount,
			currency: invoice.toPrimitives().currency,
			method: dto.method as PaymentMethod,
			chapaReference: null,
			bankReference: dto.bankReference ?? null,
			receiptNumber: dto.receiptNumber ?? null,
			paidAt: now,
			recordedByUserId: userId,
			verified: false,
			verifiedByUserId: null,
			verifiedAt: null,
			note: dto.note ?? null,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.paymentRepo.save(payment);

		// Apply payment to invoice (optimistic — verification still pending, but balance reflects)
		invoice.applyPayment(dto.amount);
		await this.invoiceRepo.update(invoice);

		this.events.emit({
			eventName: BILLING_EVENTS.PAYMENT_RECORDED,
			organizationId,
			payload: {
				paymentId: saved.id,
				invoiceId: dto.invoiceId,
				amount: dto.amount,
				method: dto.method,
				requiresVerification: true,
			},
		});

		return saved.toPrimitives();
	}
}

@Injectable()
export class VerifyPaymentHandler {
	constructor(
		private readonly paymentRepo: SubscriptionPaymentRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, userId: string, paymentId: string) {
		const p = await this.paymentRepo.findById(paymentId);
		if (!p || p.toPrimitives().organizationId !== organizationId) throw new NotFoundException("payment");
		p.verify(userId);
		const saved = await this.paymentRepo.update(p);
		this.events.emit({
			eventName: BILLING_EVENTS.PAYMENT_VERIFIED,
			organizationId,
			payload: { paymentId: saved.id },
		});
		return saved.toPrimitives();
	}
}

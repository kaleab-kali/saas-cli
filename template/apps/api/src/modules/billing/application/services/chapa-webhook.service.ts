import { Injectable, Logger } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { SubscriptionPayment } from "../../domain/entities/subscription-payment.entity";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import { SubscriptionPaymentRepository } from "../../domain/repositories/subscription-payment.repository";
import { ChapaClient } from "../../infrastructure/chapa/chapa.client";

@Injectable()
export class ChapaWebhookService {
	private readonly logger = new Logger(ChapaWebhookService.name);

	constructor(
		private readonly chapa: ChapaClient,
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly paymentRepo: SubscriptionPaymentRepository,
		private readonly events: DomainEventBus,
	) {}

	// Chapa callback — verify transaction, then record payment.
	async handle(txRef: string) {
		// Extract invoice number from txRef: pf-inv-<INV-NUMBER>-<uuid>
		const parts = txRef.split("-");
		if (parts.length < 4 || parts[0] !== "pf" || parts[1] !== "inv") {
			this.logger.warn(`unrecognized txRef: ${txRef}`);
			return { handled: false };
		}
		const invoiceNumber = parts.slice(2, -1).join("-");

		const invoice = await this.invoiceRepo.findByNumber(invoiceNumber);
		if (!invoice) {
			this.logger.warn(`invoice not found: ${invoiceNumber}`);
			return { handled: false };
		}

		// Idempotency — payment already recorded for this txRef?
		const existing = await this.paymentRepo.findByChapaReference(txRef);
		if (existing) return { handled: true, already: true };

		// Verify w/ Chapa
		const verified = await this.chapa.verify(txRef);
		if (verified.status !== "success") {
			this.logger.warn(`chapa status: ${verified.status} for ${txRef}`);
			return { handled: false, chapaStatus: verified.status };
		}

		const p = invoice.toPrimitives();
		const now = new Date();
		const payment = SubscriptionPayment.create({
			id: "",
			invoiceId: p.id,
			organizationId: p.organizationId,
			amount: verified.amount,
			currency: verified.currency,
			method: "chapa_online",
			chapaReference: txRef,
			bankReference: null,
			receiptNumber: null,
			paidAt: now,
			recordedByUserId: null,
			verified: true,
			verifiedByUserId: null,
			verifiedAt: now,
			note: `Chapa reference: ${verified.reference}`,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.paymentRepo.save(payment);
		invoice.applyPayment(verified.amount);
		await this.invoiceRepo.update(invoice);

		this.events.emit({
			eventName: BILLING_EVENTS.PAYMENT_RECORDED,
			organizationId: p.organizationId,
			payload: { paymentId: saved.id, invoiceId: p.id, amount: verified.amount, method: "chapa_online" },
		});
		if (invoice.status === "paid") {
			this.events.emit({
				eventName: BILLING_EVENTS.INVOICE_PAID,
				organizationId: p.organizationId,
				payload: { invoiceId: p.id, total: p.total },
			});
		}

		return { handled: true, paymentId: saved.id };
	}
}

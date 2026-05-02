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
		// txRef shape: inv-<INV-NUMBER>-<uuid>  (created by InitiateChapaPaymentHandler)
		const parts = txRef.split("-");
		if (parts.length < 3 || parts[0] !== "inv") {
			this.logger.warn(`unrecognized txRef: ${txRef}`);
			return { handled: false };
		}
		const invoiceNumber = parts.slice(1, -1).join("-");

		const invoice = await this.invoiceRepo.findByNumber(invoiceNumber);
		if (!invoice) {
			this.logger.warn(`invoice not found: ${invoiceNumber}`);
			return { handled: false };
		}

		// Idempotency — payment already recorded for this txRef?
		const existing = await this.paymentRepo.findByChapaTxRef(txRef);
		if (existing) return { handled: true, already: true };

		// Verify w/ Chapa per their docs (https://developer.chapa.co/docs/verify-payments/)
		const verified = await this.chapa.verify(txRef);
		if (verified.status !== "success") {
			this.logger.warn(`chapa status: ${verified.status} for ${txRef}`);
			return { handled: false, chapaStatus: verified.status };
		}

		// Chapa returns amount in major units; we store in minor.
		const amountMinor = Math.round(verified.amount * 100);

		const p = invoice.toPrimitives();
		const now = new Date();
		const payment = SubscriptionPayment.create({
			id: "",
			invoiceId: p.id,
			organizationId: p.organizationId,
			amountMinor,
			currency: verified.currency,
			method: "chapa_card",
			stripePaymentIntentId: null,
			stripeChargeId: null,
			chapaTxRef: txRef,
			chapaRefId: verified.reference ?? null,
			bankReference: null,
			receiptNumber: null,
			paidAt: now,
			recordedByUserId: null,
			verified: true,
			verifiedByUserId: null,
			verifiedAt: now,
			note: `Chapa ref_id: ${verified.reference}`,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.paymentRepo.save(payment);
		invoice.applyPayment(amountMinor);
		await this.invoiceRepo.update(invoice);

		this.events.emit({
			eventName: BILLING_EVENTS.PAYMENT_RECORDED,
			organizationId: p.organizationId,
			payload: { paymentId: saved.id, invoiceId: p.id, amountMinor, method: "chapa_card" },
		});
		if (invoice.status === "paid") {
			this.events.emit({
				eventName: BILLING_EVENTS.INVOICE_PAID,
				organizationId: p.organizationId,
				payload: { invoiceId: p.id, totalMinor: p.totalMinor },
			});
		}

		return { handled: true, paymentId: saved.id };
	}
}

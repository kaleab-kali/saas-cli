import { Injectable, Logger } from "@nestjs/common";
import type { Stripe } from "stripe/cjs/stripe.core.js";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { SubscriptionPayment } from "../../domain/entities/subscription-payment.entity";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import { SubscriptionPaymentRepository } from "../../domain/repositories/subscription-payment.repository";

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name);

	constructor(
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly paymentRepo: SubscriptionPaymentRepository,
		private readonly events: DomainEventBus,
	) {}

	/**
	 * Process a verified Stripe event. Returns { handled: boolean, ... }.
	 * Implement event types you care about. Always idempotent (re-running same event is safe).
	 */
	async handle(event: Stripe.Event): Promise<{ handled: boolean; type?: string }> {
		switch (event.type) {
			case "invoice.paid":
				return this.handleInvoicePaid(event.data.object as Stripe.Invoice);
			case "invoice.payment_failed":
				return this.handlePaymentFailed(event.data.object as Stripe.Invoice);
			case "customer.subscription.deleted":
				return this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
			default:
				this.logger.debug(`unhandled stripe event: ${event.type}`);
				return { handled: false, type: event.type };
		}
	}

	private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<{ handled: boolean; type: string }> {
		const orgId = (stripeInvoice.metadata as Record<string, string> | null)?.organizationId;
		const ourInvoiceId = (stripeInvoice.metadata as Record<string, string> | null)?.invoiceId;
		if (!orgId || !ourInvoiceId) {
			this.logger.warn(`stripe invoice.paid missing metadata: ${stripeInvoice.id}`);
			return { handled: false, type: "invoice.paid" };
		}
		const invoice = await this.invoiceRepo.findById(ourInvoiceId);
		if (!invoice) return { handled: false, type: "invoice.paid" };

		// Idempotency: already recorded?
		// biome-ignore lint/suspicious/noExplicitAny: Stripe types vary
		const piId = (stripeInvoice as any).payment_intent as string | undefined;
		if (piId) {
			const existing = await this.paymentRepo.findByStripePaymentIntentId(piId);
			if (existing) return { handled: true, type: "invoice.paid" };
		}

		const amountMinor = stripeInvoice.amount_paid;
		const now = new Date();
		const payment = SubscriptionPayment.create({
			id: "",
			invoiceId: invoice.id,
			organizationId: orgId,
			amountMinor,
			currency: stripeInvoice.currency.toUpperCase(),
			method: "stripe_card",
			stripePaymentIntentId: piId ?? null,
			stripeChargeId: null,
			chapaTxRef: null,
			chapaRefId: null,
			bankReference: null,
			receiptNumber: null,
			paidAt: now,
			recordedByUserId: null,
			verified: true,
			verifiedByUserId: null,
			verifiedAt: now,
			note: `Stripe invoice ${stripeInvoice.id}`,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.paymentRepo.save(payment);
		invoice.applyPayment(amountMinor);
		await this.invoiceRepo.update(invoice);

		this.events.emit({
			eventName: BILLING_EVENTS.PAYMENT_RECORDED,
			organizationId: orgId,
			payload: { paymentId: saved.id, invoiceId: invoice.id, amountMinor, method: "stripe_card" },
		});
		return { handled: true, type: "invoice.paid" };
	}

	private async handlePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<{ handled: boolean; type: string }> {
		this.logger.warn(`stripe invoice.payment_failed: ${stripeInvoice.id}`);
		// Subscription lifecycle cron handles past_due transition; webhook just logs.
		return { handled: true, type: "invoice.payment_failed" };
	}

	private async handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<{ handled: boolean; type: string }> {
		this.logger.log(`stripe subscription canceled: ${sub.id}`);
		return { handled: true, type: "customer.subscription.deleted" };
	}
}

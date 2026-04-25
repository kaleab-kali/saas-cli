import { Injectable, Logger } from "@nestjs/common";
import StripeCtor from "stripe";
import type { Stripe } from "stripe/cjs/stripe.core.js";

/**
 * Stripe REST client wrapper. Lazy — instantiates only when used.
 * Docs: https://stripe.com/docs/api
 */
@Injectable()
export class StripeClient {
	private readonly logger = new Logger(StripeClient.name);
	private _stripe: Stripe | null = null;

	private get stripe(): Stripe {
		if (!this._stripe) {
			const key = process.env.STRIPE_SECRET_KEY ?? "";
			if (!key) {
				this.logger.warn("STRIPE_SECRET_KEY not set — Stripe payments disabled");
			}
			this._stripe = new StripeCtor(key);
		}
		return this._stripe;
	}

	async getOrCreateCustomer(input: {
		organizationId: string;
		email: string;
		name?: string;
	}): Promise<Stripe.Customer> {
		const existing = await this.stripe.customers.search({
			query: `metadata['organizationId']:'${input.organizationId}'`,
			limit: 1,
		});
		if (existing.data[0]) return existing.data[0];
		return this.stripe.customers.create({
			email: input.email,
			name: input.name,
			metadata: { organizationId: input.organizationId },
		});
	}

	async createCheckoutSession(input: {
		customerId: string;
		priceId: string;
		successUrl: string;
		cancelUrl: string;
		organizationId: string;
		invoiceId?: string;
	}): Promise<{ checkoutUrl: string; sessionId: string }> {
		const session = await this.stripe.checkout.sessions.create({
			mode: "subscription",
			customer: input.customerId,
			line_items: [{ price: input.priceId, quantity: 1 }],
			success_url: input.successUrl,
			cancel_url: input.cancelUrl,
			metadata: {
				organizationId: input.organizationId,
				invoiceId: input.invoiceId ?? "",
			},
		});
		if (!session.url) throw new Error("Stripe did not return checkout URL");
		return { checkoutUrl: session.url, sessionId: session.id };
	}

	async createPortalSession(customerId: string, returnUrl: string): Promise<{ portalUrl: string }> {
		const session = await this.stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl,
		});
		return { portalUrl: session.url };
	}

	constructEvent(rawBody: string | Buffer, signatureHeader: string): Stripe.Event {
		const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
		if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
		return this.stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
	}

	async getSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
		return this.stripe.subscriptions.retrieve(stripeSubscriptionId);
	}

	async cancelSubscription(stripeSubscriptionId: string, immediate: boolean): Promise<Stripe.Subscription> {
		if (immediate) return this.stripe.subscriptions.cancel(stripeSubscriptionId);
		return this.stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
	}
}

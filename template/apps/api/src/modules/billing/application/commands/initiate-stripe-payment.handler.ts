import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import { StripeClient } from "../../infrastructure/stripe/stripe.client";

@Injectable()
export class InitiateStripePaymentHandler {
	constructor(
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly stripe: StripeClient,
	) {}

	async execute(
		organizationId: string,
		invoiceId: string,
		user: { email: string; name?: string },
	): Promise<{ checkoutUrl: string }> {
		const invoice = await this.invoiceRepo.findById(invoiceId);
		if (!invoice || invoice.toPrimitives().organizationId !== organizationId) {
			throw new NotFoundException("invoice");
		}
		const p = invoice.toPrimitives();
		if (p.status === "paid") throw new ConflictException("invoice already paid");
		if (p.status === "void") throw new ConflictException("invoice void");

		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) throw new NotFoundException("subscription");
		const plan = await this.planRepo.findById(sub.toPrimitives().planId);
		if (!plan) throw new NotFoundException("plan");
		const planP = plan.toPrimitives();
		const interval = sub.toPrimitives().billingInterval;
		const priceId = interval === "annual" ? planP.stripePriceIdAnnual : planP.stripePriceIdMonthly;
		if (!priceId) {
			throw new ConflictException(
				`Plan ${planP.slug} has no Stripe ${interval} price id configured. Set stripePriceId* on the Plan first.`,
			);
		}

		const customer = await this.stripe.getOrCreateCustomer({
			organizationId,
			email: user.email,
			name: user.name,
		});

		const frontUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
		const result = await this.stripe.createCheckoutSession({
			customerId: customer.id,
			priceId,
			successUrl: `${frontUrl}/settings/billing?paid=true`,
			cancelUrl: `${frontUrl}/settings/billing?cancelled=true`,
			organizationId,
			invoiceId: p.id,
		});

		// Persist customer id on subscription for later (cron renewal, portal).
		const subEntity = await this.subRepo.findByOrg(organizationId);
		if (subEntity) {
			const props = subEntity.toPrimitives();
			if (!props.stripeCustomerId) {
				// biome-ignore lint/suspicious/noExplicitAny: writing through entity — small surface
				(subEntity as any).props.stripeCustomerId = customer.id;
				await this.subRepo.update(subEntity);
			}
		}

		return { checkoutUrl: result.checkoutUrl };
	}
}

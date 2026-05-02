import type { Subscription as PrismaSubscription } from "../../../../generated/prisma/client";
import { type Gateway, Subscription } from "../../domain/entities/subscription.entity";
import type { BillingInterval, PlanSlug, SubscriptionStatus } from "../../domain/value-objects/feature-keys.vo";

export class SubscriptionMapper {
	static toDomain(row: PrismaSubscription & { plan: { slug: string } }): Subscription {
		return Subscription.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			planId: row.planId,
			planSlug: row.plan.slug as PlanSlug,
			status: row.status as SubscriptionStatus,
			billingInterval: row.billingInterval as BillingInterval,
			currency: row.currency,
			gateway: row.gateway as Gateway,
			stripeCustomerId: row.stripeCustomerId,
			stripeSubscriptionId: row.stripeSubscriptionId,
			chapaCustomerEmail: row.chapaCustomerEmail,
			lastChapaTxRef: row.lastChapaTxRef,
			currentPeriodStart: row.currentPeriodStart,
			currentPeriodEnd: row.currentPeriodEnd,
			canceledAt: row.canceledAt,
			cancelAtPeriodEnd: row.cancelAtPeriodEnd,
			trialEndsAt: row.trialEndsAt,
			creditBalanceMinor: row.creditBalanceMinor,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(sub: Subscription) {
		return sub.toPrimitives();
	}
}

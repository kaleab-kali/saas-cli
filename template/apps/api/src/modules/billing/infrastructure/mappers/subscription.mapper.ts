import type { Subscription as PrismaSubscription } from "../../../../generated/prisma/client";
import { Subscription } from "../../domain/entities/subscription.entity";
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
			chapaCustomerId: row.chapaCustomerId,
			chapaSubscriptionId: row.chapaSubscriptionId,
			currentPeriodStart: row.currentPeriodStart,
			currentPeriodEnd: row.currentPeriodEnd,
			canceledAt: row.canceledAt,
			cancelAtPeriodEnd: row.cancelAtPeriodEnd,
			campaignActiveUntil: row.campaignActiveUntil,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(sub: Subscription) {
		return sub.toPrimitives();
	}
}

import type { Subscription } from "../entities/subscription.entity";

export abstract class SubscriptionRepository {
	abstract findByOrg(organizationId: string): Promise<Subscription | null>;
	abstract findById(id: string): Promise<Subscription | null>;
	abstract save(sub: Subscription): Promise<Subscription>;
	abstract update(sub: Subscription): Promise<Subscription>;
	abstract listDueForRenewal(before: Date): Promise<Subscription[]>;
}

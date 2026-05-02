import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { CancelSubscriptionDto } from "../dto/billing.dto";

@Injectable()
export class CancelSubscriptionHandler {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: CancelSubscriptionDto) {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) throw new NotFoundException("no subscription");
		sub.cancel(dto.immediate ?? false);
		const saved = await this.subRepo.update(sub);
		this.events.emit({
			eventName: BILLING_EVENTS.SUBSCRIPTION_CANCELED,
			organizationId,
			payload: { subscriptionId: saved.id, immediate: dto.immediate ?? false },
		});
		return saved.toPrimitives();
	}
}

@Injectable()
export class ResumeSubscriptionHandler {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string) {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) throw new NotFoundException("no subscription");
		sub.resume();
		const saved = await this.subRepo.update(sub);
		this.events.emit({
			eventName: BILLING_EVENTS.SUBSCRIPTION_RESUMED,
			organizationId,
			payload: { subscriptionId: saved.id },
		});
		return saved.toPrimitives();
	}
}

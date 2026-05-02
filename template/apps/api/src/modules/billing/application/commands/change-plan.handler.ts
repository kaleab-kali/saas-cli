import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { PlanSlug } from "../../domain/value-objects/feature-keys.vo";
import type { ChangePlanDto } from "../dto/billing.dto";

@Injectable()
export class ChangePlanHandler {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: ChangePlanDto) {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) throw new NotFoundException("no subscription");
		const plan = await this.planRepo.findBySlug(dto.planSlug);
		if (!plan) throw new NotFoundException(`plan: ${dto.planSlug}`);

		const oldSlug = sub.planSlug;
		sub.changePlan(plan.id, plan.slug as PlanSlug);
		const saved = await this.subRepo.update(sub);

		this.events.emit({
			eventName: BILLING_EVENTS.SUBSCRIPTION_PLAN_CHANGED,
			organizationId,
			payload: { from: oldSlug, to: plan.slug },
		});
		return saved.toPrimitives();
	}
}

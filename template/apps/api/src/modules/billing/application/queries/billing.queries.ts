import { Injectable } from "@nestjs/common";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import {
	type InvoiceListQuery,
	SubscriptionInvoiceRepository,
} from "../../domain/repositories/subscription-invoice.repository";
import { SubscriptionPaymentRepository } from "../../domain/repositories/subscription-payment.repository";
import { EntitlementService } from "../services/entitlement.service";
import { UsageTrackerService } from "../services/usage-tracker.service";

@Injectable()
export class ListPlansHandler {
	constructor(private readonly planRepo: PlanRepository) {}
	async execute() {
		const plans = await this.planRepo.findAll();
		return plans.map((p) => p.toPrimitives());
	}
}

@Injectable()
export class GetSubscriptionHandler {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
	) {}
	async execute(organizationId: string) {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) return { subscription: null, plan: null };
		const plan = await this.planRepo.findById(sub.toPrimitives().planId);
		return {
			subscription: sub.toPrimitives(),
			plan: plan?.toPrimitives() ?? null,
		};
	}
}

@Injectable()
export class ListSubscriptionInvoicesHandler {
	constructor(private readonly repo: SubscriptionInvoiceRepository) {}
	async execute(organizationId: string, q: InvoiceListQuery) {
		const { rows, total } = await this.repo.list(organizationId, q);
		return { data: rows.map((r) => r.toPrimitives()), total };
	}
}

@Injectable()
export class GetInvoicePaymentsHandler {
	constructor(private readonly repo: SubscriptionPaymentRepository) {}
	async execute(invoiceId: string) {
		const payments = await this.repo.listByInvoice(invoiceId);
		return payments.map((p) => p.toPrimitives());
	}
}

@Injectable()
export class GetUsageHandler {
	constructor(private readonly tracker: UsageTrackerService) {}
	async execute(organizationId: string) {
		return this.tracker.getCurrent(organizationId);
	}
}

@Injectable()
export class GetEntitlementsHandler {
	constructor(private readonly svc: EntitlementService) {}
	async execute(organizationId: string) {
		return this.svc.getEntitlementMap(organizationId);
	}
}

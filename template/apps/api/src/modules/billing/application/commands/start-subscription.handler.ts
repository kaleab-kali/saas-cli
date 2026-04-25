import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { Subscription } from "../../domain/entities/subscription.entity";
import { SubscriptionInvoice } from "../../domain/entities/subscription-invoice.entity";
import { BILLING_EVENTS } from "../../domain/events/billing.events";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import type { BillingInterval, PlanSlug } from "../../domain/value-objects/feature-keys.vo";
import type { StartSubscriptionDto } from "../dto/billing.dto";

@Injectable()
export class StartSubscriptionHandler {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: StartSubscriptionDto) {
		const existing = await this.subRepo.findByOrg(organizationId);
		if (existing?.isActive) {
			throw new ConflictException("organization already has active subscription");
		}

		const plan = await this.planRepo.findBySlug(dto.planSlug);
		if (!plan) throw new NotFoundException(`plan not found: ${dto.planSlug}`);
		const p = plan.toPrimitives();

		const now = new Date();
		const months = dto.billingInterval === "annual" ? 12 : 1;
		const end = new Date(now);
		end.setMonth(end.getMonth() + months);

		const sub = Subscription.create({
			id: "",
			organizationId,
			planId: p.id,
			planSlug: p.slug as PlanSlug,
			status: "active",
			billingInterval: dto.billingInterval as BillingInterval,
			currency: "ETB",
			chapaCustomerId: null,
			chapaSubscriptionId: null,
			currentPeriodStart: now,
			currentPeriodEnd: end,
			canceledAt: null,
			cancelAtPeriodEnd: false,
			campaignActiveUntil: null,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.subRepo.save(sub);

		// First invoice — subtotal = plan price (monthly or annual)
		const subtotal = dto.billingInterval === "annual" ? p.priceAnnualEtb : p.priceMonthlyEtb;
		if (subtotal <= 0) throw new BadRequestException("invalid plan price");
		const number = await this.invoiceRepo.nextInvoiceNumber(organizationId);
		const dueDate = new Date(now);
		dueDate.setDate(dueDate.getDate() + 7);

		const invoice = SubscriptionInvoice.create({
			id: "",
			subscriptionId: saved.id,
			organizationId,
			number,
			status: "draft",
			issueDate: now,
			dueDate,
			periodStart: now,
			periodEnd: end,
			currency: "ETB",
			subtotal,
			amountPaid: 0,
			lineType: "subscription",
			description: `${p.nameEn} — ${dto.billingInterval} (${now.toLocaleDateString("en-GB")} — ${end.toLocaleDateString("en-GB")})`,
			pdfUrl: null,
			sentAt: null,
			paidAt: null,
			createdAt: now,
			updatedAt: now,
		});
		const savedInvoice = await this.invoiceRepo.save(invoice);

		this.events.emit({
			eventName: BILLING_EVENTS.SUBSCRIPTION_CREATED,
			organizationId,
			payload: { subscriptionId: saved.id, planSlug: p.slug, billingInterval: dto.billingInterval },
		});
		this.events.emit({
			eventName: BILLING_EVENTS.INVOICE_ISSUED,
			organizationId,
			payload: { invoiceId: savedInvoice.id, total: savedInvoice.toPrimitives().total },
		});

		return { subscription: saved.toPrimitives(), invoice: savedInvoice.toPrimitives() };
	}
}

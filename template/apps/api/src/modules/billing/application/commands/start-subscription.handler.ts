import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { formatDateInTimeZone } from "#shared/i18n/time-zone.util";
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
		private readonly prisma: PrismaService,
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
			currency: p.currency,
			gateway: "manual",
			stripeCustomerId: null,
			stripeSubscriptionId: null,
			chapaCustomerEmail: null,
			lastChapaTxRef: null,
			currentPeriodStart: now,
			currentPeriodEnd: end,
			canceledAt: null,
			cancelAtPeriodEnd: false,
			trialEndsAt: null,
			creditBalanceMinor: 0,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.subRepo.save(sub);

		const subtotalMinor = dto.billingInterval === "annual" ? p.priceAnnualMinor : p.priceMonthlyMinor;
		if (subtotalMinor <= 0) throw new BadRequestException("invalid plan price");

		// Org-level tax rate
		const orgSettings = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
			select: { taxRatePct: true },
		});
		const taxRatePct = orgSettings?.taxRatePct ?? 0;

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
			currency: p.currency,
			subtotalMinor,
			amountPaidMinor: 0,
			lineType: "subscription",
			description: `${p.nameEn} - ${dto.billingInterval} (${formatDateInTimeZone(now)} - ${formatDateInTimeZone(end)})`,
			stripeInvoiceId: null,
			chapaTxRef: null,
			checkoutUrl: null,
			pdfUrl: null,
			sentAt: null,
			paidAt: null,
			createdAt: now,
			updatedAt: now,
			taxRatePct,
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
			payload: { invoiceId: savedInvoice.id, totalMinor: savedInvoice.toPrimitives().totalMinor },
		});

		return { subscription: saved.toPrimitives(), invoice: savedInvoice.toPrimitives() };
	}
}

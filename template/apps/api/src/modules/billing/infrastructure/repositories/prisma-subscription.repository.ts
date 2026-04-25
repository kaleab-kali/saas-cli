import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Subscription } from "../../domain/entities/subscription.entity";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { SubscriptionMapper } from "../mappers/subscription.mapper";

@Injectable()
export class PrismaSubscriptionRepository extends SubscriptionRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByOrg(organizationId: string) {
		const row = await this.prisma.subscription.findUnique({
			where: { organizationId },
			include: { plan: { select: { slug: true } } },
		});
		return row ? SubscriptionMapper.toDomain(row) : null;
	}

	async findById(id: string) {
		const row = await this.prisma.subscription.findUnique({
			where: { id },
			include: { plan: { select: { slug: true } } },
		});
		return row ? SubscriptionMapper.toDomain(row) : null;
	}

	async save(sub: Subscription): Promise<Subscription> {
		const p = sub.toPrimitives();
		const row = await this.prisma.subscription.create({
			data: {
				organizationId: p.organizationId,
				planId: p.planId,
				status: p.status,
				billingInterval: p.billingInterval,
				currency: p.currency,
				gateway: p.gateway,
				stripeCustomerId: p.stripeCustomerId,
				stripeSubscriptionId: p.stripeSubscriptionId,
				chapaCustomerEmail: p.chapaCustomerEmail,
				lastChapaTxRef: p.lastChapaTxRef,
				currentPeriodStart: p.currentPeriodStart,
				currentPeriodEnd: p.currentPeriodEnd,
				trialEndsAt: p.trialEndsAt,
				creditBalanceMinor: p.creditBalanceMinor,
			},
			include: { plan: { select: { slug: true } } },
		});
		return SubscriptionMapper.toDomain(row);
	}

	async update(sub: Subscription): Promise<Subscription> {
		const p = sub.toPrimitives();
		const row = await this.prisma.subscription.update({
			where: { id: p.id },
			data: {
				planId: p.planId,
				status: p.status,
				billingInterval: p.billingInterval,
				currency: p.currency,
				gateway: p.gateway,
				stripeCustomerId: p.stripeCustomerId,
				stripeSubscriptionId: p.stripeSubscriptionId,
				chapaCustomerEmail: p.chapaCustomerEmail,
				lastChapaTxRef: p.lastChapaTxRef,
				currentPeriodStart: p.currentPeriodStart,
				currentPeriodEnd: p.currentPeriodEnd,
				canceledAt: p.canceledAt,
				cancelAtPeriodEnd: p.cancelAtPeriodEnd,
				trialEndsAt: p.trialEndsAt,
				creditBalanceMinor: p.creditBalanceMinor,
			},
			include: { plan: { select: { slug: true } } },
		});
		return SubscriptionMapper.toDomain(row);
	}

	async listDueForRenewal(before: Date) {
		const rows = await this.prisma.subscription.findMany({
			where: { currentPeriodEnd: { lte: before }, status: { in: ["active", "trialing"] } },
			include: { plan: { select: { slug: true } } },
		});
		return rows.map(SubscriptionMapper.toDomain);
	}
}

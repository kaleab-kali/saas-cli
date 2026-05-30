import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";

export interface EntitlementCheck {
	allowed: boolean;
	reason: "enabled" | "disabled" | "no-subscription" | "limit-exceeded" | "admin-override";
	limit: number | null;
	currentUsage?: number;
}

@Injectable()
export class EntitlementService {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly prisma: PrismaService,
	) {}

	async can(organizationId: string, featureKey: FeatureKey | string): Promise<EntitlementCheck> {
		const now = new Date();
		const override = await this.prisma.orgEntitlementOverride.findUnique({
			where: { organizationId_featureKey: { organizationId, featureKey } },
		});
		if (override && (!override.expiresAt || override.expiresAt > now)) {
			return {
				allowed: override.enabled,
				reason: "admin-override",
				limit: override.limit,
			};
		}

		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub?.isActive) {
			return { allowed: false, reason: "no-subscription", limit: null };
		}
		const plan = await this.planRepo.findById(sub.toPrimitives().planId);
		if (!plan) return { allowed: false, reason: "no-subscription", limit: null };

		const enabled = plan.hasFeature(featureKey);
		const limit = plan.featureLimit(featureKey);

		if (enabled) {
			return { allowed: true, reason: "enabled", limit };
		}

		return { allowed: false, reason: "disabled", limit: 0 };
	}

	async assertCan(organizationId: string, featureKey: FeatureKey | string): Promise<void> {
		const check = await this.can(organizationId, featureKey);
		if (!check.allowed) {
			throw new ForbiddenException({
				code: "FEATURE_NOT_IN_PLAN",
				message: `Feature '${featureKey}' not available on your plan`,
				featureKey,
				reason: check.reason,
			});
		}
	}

	async getEntitlementMap(organizationId: string): Promise<Record<string, { enabled: boolean; limit: number | null }>> {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub?.isActive) return {};
		const plan = await this.planRepo.findById(sub.toPrimitives().planId);
		if (!plan) return {};

		const map: Record<string, { enabled: boolean; limit: number | null }> = {};
		for (const e of plan.toPrimitives().entitlements) {
			map[e.featureKey] = { enabled: e.enabled, limit: e.limit };
		}
		const overrides = await this.prisma.orgEntitlementOverride.findMany({
			where: {
				organizationId,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
		});
		for (const override of overrides) {
			map[override.featureKey] = { enabled: override.enabled, limit: override.limit };
		}
		return map;
	}
}

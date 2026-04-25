import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { CampaignActivationRepository } from "../../domain/repositories/campaign-activation.repository";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";

// Features that campaign add-on unlocks (sales module temporarily)
const CAMPAIGN_FEATURE_OVERRIDES: readonly string[] = ["sales.module", "sales.agent-role", "sales.usd-pricing"];

export interface EntitlementCheck {
	allowed: boolean;
	reason: "enabled" | "disabled" | "no-subscription" | "limit-exceeded" | "campaign-override" | "admin-override";
	limit: number | null;
	currentUsage?: number;
}

@Injectable()
export class EntitlementService {
	constructor(
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly campaignRepo: CampaignActivationRepository,
		private readonly prisma: PrismaService,
	) {}

	/**
	 * Core check — does this org have the feature?
	 * Handles base-plan entitlements + admin per-org overrides + campaign overrides.
	 */
	async can(organizationId: string, featureKey: FeatureKey | string): Promise<EntitlementCheck> {
		// 1. Admin per-org override takes precedence over everything
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

		// 3. Campaign override
		if (CAMPAIGN_FEATURE_OVERRIDES.includes(featureKey)) {
			const campaign = await this.campaignRepo.findActiveByOrg(organizationId);
			if (campaign?.isActive) {
				return { allowed: true, reason: "campaign-override", limit: null };
			}
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

	/**
	 * Returns the full entitlement map for an org — for frontend paywall rendering.
	 */
	async getEntitlementMap(organizationId: string): Promise<Record<string, { enabled: boolean; limit: number | null }>> {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub?.isActive) return {};
		const plan = await this.planRepo.findById(sub.toPrimitives().planId);
		if (!plan) return {};

		const map: Record<string, { enabled: boolean; limit: number | null }> = {};
		for (const e of plan.toPrimitives().entitlements) {
			map[e.featureKey] = { enabled: e.enabled, limit: e.limit };
		}

		// Campaign overrides
		const campaign = await this.campaignRepo.findActiveByOrg(organizationId);
		if (campaign?.isActive) {
			for (const key of CAMPAIGN_FEATURE_OVERRIDES) {
				map[key] = { enabled: true, limit: null };
			}
		}
		return map;
	}
}

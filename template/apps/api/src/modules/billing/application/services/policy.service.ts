import { ForbiddenException, Injectable } from "@nestjs/common";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";
import { FEATURE_REGISTRY, type FeatureDefinition } from "../../domain/value-objects/feature-registry";
import { EntitlementService } from "./entitlement.service";
import { type UsageCurrent, UsageTrackerService } from "./usage-tracker.service";

export interface Capability {
	key: FeatureKey;
	label: string;
	category: string;
	enabled: boolean;
	limit: number | null;
	used: number | null;
	remaining: number | null;
	reason: string;
}

@Injectable()
export class PolicyService {
	constructor(
		private readonly entitlements: EntitlementService,
		private readonly usage: UsageTrackerService,
	) {}

	async assertFeature(organizationId: string, featureKey: FeatureKey | string): Promise<void> {
		await this.entitlements.assertCan(organizationId, featureKey);
	}

	async assertWithinLimit(organizationId: string, featureKey: FeatureKey, nextUsageDelta = 1): Promise<void> {
		await this.assertFeature(organizationId, featureKey);
		const [check, current] = await Promise.all([
			this.entitlements.can(organizationId, featureKey),
			this.usage.getCurrent(organizationId),
		]);
		if (check.limit === null) return;
		const used = this.usedFor(featureKey, current);
		if (used + nextUsageDelta > check.limit) {
			throw new ForbiddenException({
				code: "USAGE_CAP_EXCEEDED",
				message: `Feature '${featureKey}' limit exceeded for the current plan`,
				featureKey,
				limit: check.limit,
				current: used,
				next: used + nextUsageDelta,
			});
		}
	}

	async capabilities(organizationId: string): Promise<Record<string, Capability>> {
		const [entitlements, usage] = await Promise.all([
			this.entitlements.getEntitlementMap(organizationId),
			this.usage.getCurrent(organizationId),
		]);
		const out: Record<string, Capability> = {};
		for (const [key, definition] of Object.entries(FEATURE_REGISTRY) as Array<[FeatureKey, FeatureDefinition]>) {
			const entitlement = entitlements[key];
			const enabled = entitlement?.enabled ?? false;
			const limit = entitlement?.limit ?? null;
			const used = definition.enforcement === "limit" ? this.usedFor(key, usage) : null;
			out[key] = {
				key,
				label: definition.label,
				category: definition.category,
				enabled,
				limit,
				used,
				remaining: limit === null || used === null ? null : Math.max(0, limit - used),
				reason: enabled ? "enabled" : "not-in-plan",
			};
		}
		return out;
	}

	private usedFor(featureKey: FeatureKey, usage: UsageCurrent): number {
		switch (FEATURE_REGISTRY[featureKey].usageMetric) {
			case "users":
				return usage.userCount;
			case "apiKeys":
				return usage.apiKeyCount;
			case "files":
				return usage.fileCount;
			case "storageBytes":
				return usage.storageBytes;
			case "apiRequestsPerMinute":
				return usage.apiCallCount;
			case "emails":
				return usage.emailCount;
			case "savedReports":
				return usage.savedReportCount;
			case "reportSchedules":
				return usage.reportScheduleCount;
			default:
				return 0;
		}
	}
}

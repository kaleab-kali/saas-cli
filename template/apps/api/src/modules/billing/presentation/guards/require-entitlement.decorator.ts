import { SetMetadata } from "@nestjs/common";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";

export const REQUIRE_ENTITLEMENT_KEY = "requireEntitlement" as const;
export const REQUIRE_FEATURE_KEY = "requireFeature" as const;
export const REQUIRE_USAGE_LIMIT_KEY = "requireUsageLimit" as const;

export interface UsageLimitRequirement {
	featureKey: FeatureKey;
	nextUsageDelta: number;
}

/**
 * @RequireEntitlement("platform.api-keys") on a controller/handler will reject requests
 * from orgs whose plan does not include that feature (403 w/ FEATURE_NOT_IN_PLAN).
 */
export const RequireEntitlement = (featureKey: FeatureKey) => SetMetadata(REQUIRE_ENTITLEMENT_KEY, featureKey);
export const RequireFeature = (featureKey: FeatureKey) => SetMetadata(REQUIRE_FEATURE_KEY, featureKey);
export const RequireUsageLimit = (featureKey: FeatureKey, nextUsageDelta = 1) =>
	SetMetadata(REQUIRE_USAGE_LIMIT_KEY, { featureKey, nextUsageDelta } satisfies UsageLimitRequirement);

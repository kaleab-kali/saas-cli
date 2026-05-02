import { SetMetadata } from "@nestjs/common";

export const REQUIRE_ENTITLEMENT_KEY = "requireEntitlement" as const;

/**
 * @RequireEntitlement("sales.module") on a controller/handler will reject requests
 * from orgs whose plan does not include that feature (403 w/ FEATURE_NOT_IN_PLAN).
 */
export const RequireEntitlement = (featureKey: string) => SetMetadata(REQUIRE_ENTITLEMENT_KEY, featureKey);

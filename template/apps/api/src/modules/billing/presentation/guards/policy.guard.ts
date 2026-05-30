import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PolicyService } from "../../application/services/policy.service";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";
import {
	REQUIRE_ENTITLEMENT_KEY,
	REQUIRE_FEATURE_KEY,
	REQUIRE_USAGE_LIMIT_KEY,
	type UsageLimitRequirement,
} from "./require-entitlement.decorator";

@Injectable()
export class PolicyGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly policies: PolicyService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const featureKey = this.reflector.getAllAndOverride<FeatureKey | undefined>(REQUIRE_FEATURE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		const entitlementKey = this.reflector.getAllAndOverride<FeatureKey | undefined>(REQUIRE_ENTITLEMENT_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		const usageLimit = this.reflector.getAllAndOverride<UsageLimitRequirement | undefined>(REQUIRE_USAGE_LIMIT_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!featureKey && !entitlementKey && !usageLimit) return true;

		const organizationId = this.organizationId(context);
		if (!organizationId) {
			throw new ForbiddenException({
				code: "TENANT_CONTEXT_REQUIRED",
				message: "A tenant context is required for feature policy checks",
			});
		}

		if (featureKey) await this.policies.assertFeature(organizationId, featureKey);
		if (entitlementKey) await this.policies.assertFeature(organizationId, entitlementKey);
		if (usageLimit) {
			await this.policies.assertWithinLimit(organizationId, usageLimit.featureKey, usageLimit.nextUsageDelta);
		}

		return true;
	}

	private organizationId(context: ExecutionContext): string | undefined {
		const req = context.switchToHttp().getRequest<{
			organizationId?: string;
			session?: { session?: { activeOrganizationId?: string } };
		}>();
		return req.organizationId ?? req.session?.session?.activeOrganizationId;
	}
}

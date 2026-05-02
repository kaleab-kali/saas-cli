import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EntitlementService } from "../../application/services/entitlement.service";
import { REQUIRE_ENTITLEMENT_KEY } from "./require-entitlement.decorator";

@Injectable()
export class EntitlementGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly entitlements: EntitlementService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const featureKey = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_ENTITLEMENT_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!featureKey) return true;
		// Guards execute BEFORE interceptors. OrgContextInterceptor sets req.organizationId
		// during the interceptor phase, so it's not yet populated here. Fall back to session.
		const req = context.switchToHttp().getRequest<{
			organizationId?: string;
			session?: { session?: { activeOrganizationId?: string } };
		}>();
		const organizationId = req.organizationId ?? req.session?.session?.activeOrganizationId;
		if (!organizationId) return false;
		await this.entitlements.assertCan(organizationId, featureKey);
		return true;
	}
}

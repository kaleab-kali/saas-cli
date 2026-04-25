import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "#modules/auth/auth.config";
import { PrismaService } from "#shared/database/prisma.service";
import { SubscriptionLifecycleService } from "../application/services/subscription-lifecycle.service";

export const BYPASS_SUBSCRIPTION_STATE = "bypassSubscriptionState";

// Prefixes that always bypass (billing payments, admin, auth, health, docs).
const BYPASS_PATH_PREFIXES = [
	"/billing",
	"/admin",
	"/auth",
	"/api/auth",
	"/api/v1/auth",
	"/health",
	"/api/docs",
	"/api/v1/billing",
	"/api/v1/admin",
	"/api/v1/health",
];

@Injectable()
export class SubscriptionStateGuard implements CanActivate {
	constructor(
		private readonly lifecycle: SubscriptionLifecycleService,
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest();
		const url: string = req.originalUrl ?? req.url ?? "";
		if (BYPASS_PATH_PREFIXES.some((p) => url.startsWith(p))) return true;

		const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_SUBSCRIPTION_STATE, [
			context.getHandler(),
			context.getClass(),
		]);
		if (bypass) return true;

		// Resolve orgId — prefer request.session (set by AuthGuard) or call Better Auth directly.
		let orgId: string | undefined = req.organizationId || req.session?.session?.activeOrganizationId;
		if (!orgId) {
			try {
				const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
				orgId = session?.session?.activeOrganizationId ?? undefined;
				if (session) req.session = session;
			} catch {
				return true; // no session → other guards will 401
			}
		}
		if (!orgId) return true;

		// Org suspended → block hard (402 everywhere except billing).
		const org = await this.prisma.organization.findUnique({
			where: { id: orgId },
			select: { suspendedAt: true, suspendReason: true },
		});
		if (org?.suspendedAt) {
			throw new HttpException(
				{
					error: {
						code: "ORG_SUSPENDED",
						status: "suspended",
						message: org.suspendReason || "Organization suspended by platform admin.",
					},
				},
				402,
			);
		}

		const snap = await this.lifecycle.snapshot(orgId);
		if (!snap) return true;

		if (snap.isFullyLocked) {
			throw new HttpException(
				{
					error: {
						code: "SUBSCRIPTION_LOCKED",
						status: snap.status,
						message:
							snap.status === "locked"
								? "Subscription locked due to non-payment. Contact billing to restore access."
								: snap.status === "suspended"
									? "Organization suspended by platform admin."
									: "Subscription canceled.",
					},
				},
				402,
			);
		}
		if (snap.status === "read_only" && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
			throw new HttpException(
				{
					error: {
						code: "SUBSCRIPTION_READ_ONLY",
						status: snap.status,
						readOnlyModeEndsAt: snap.readOnlyModeEndsAt,
						daysUntilLocked: snap.daysUntilLocked,
						message: "Subscription in read-only mode. Pay outstanding invoice to restore write access.",
					},
				},
				402,
			);
		}
		if (snap.status === "past_due") {
			const res = context.switchToHttp().getResponse();
			res.setHeader?.("X-Subscription-Warning", "past_due");
			res.setHeader?.("X-Subscription-Grace-Ends", snap.gracePeriodEndsAt?.toISOString() ?? "");
		}
		return true;
	}
}

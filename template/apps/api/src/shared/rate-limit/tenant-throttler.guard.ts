import type { IncomingHttpHeaders } from "node:http";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { auth } from "#modules/auth/auth.config";

interface SessionPayload {
	readonly session?: {
		readonly id?: string | null;
		readonly activeOrganizationId?: string | null;
	};
	readonly user?: {
		readonly id?: string | null;
	};
}

interface RateLimitRequest extends Record<string, unknown> {
	readonly headers?: IncomingHttpHeaders;
	readonly ip?: string;
	readonly ips?: string[];
	readonly socket?: { readonly remoteAddress?: string };
	apiKeyId?: string;
	organizationId?: string;
	session?: SessionPayload;
	adminSession?: { readonly id?: string | null };
	adminUser?: { readonly id?: string | null };
}

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
	protected override async getTracker(req: Record<string, unknown>): Promise<string> {
		const request = req as RateLimitRequest;
		const existingTenant = cleanTrackerValue(request.organizationId ?? request.session?.session?.activeOrganizationId);
		if (existingTenant) return `tenant:${existingTenant}`;

		const existingAdmin = cleanTrackerValue(request.adminUser?.id ?? request.adminSession?.id);
		if (existingAdmin) return `admin:${existingAdmin}`;

		const tenantSession = await this.resolveTenantSession(request);
		const sessionTenant = cleanTrackerValue(tenantSession?.session?.activeOrganizationId);
		if (tenantSession && sessionTenant) {
			request.session = tenantSession;
			request.organizationId = sessionTenant;
			return `tenant:${sessionTenant}`;
		}

		const apiKeyId = cleanTrackerValue(request.apiKeyId);
		if (apiKeyId) return `api-key:${apiKeyId}`;

		const adminSession = await this.resolveAdminSession(request);
		const adminId = cleanTrackerValue(adminSession?.user?.id ?? adminSession?.session?.id);
		if (adminSession && adminId) {
			request.adminUser = adminSession?.user;
			request.adminSession = adminSession?.session;
			return `admin:${adminId}`;
		}

		return `ip:${this.clientIp(request)}`;
	}

	private async resolveTenantSession(request: RateLimitRequest): Promise<SessionPayload | null> {
		try {
			return (await auth.api.getSession({ headers: fromNodeHeaders(request.headers ?? {}) })) as SessionPayload | null;
		} catch {
			return null;
		}
	}

	private async resolveAdminSession(request: RateLimitRequest): Promise<SessionPayload | null> {
		try {
			return (await adminAuth.api.getSession({
				headers: fromNodeHeaders(request.headers ?? {}),
			})) as SessionPayload | null;
		} catch {
			return null;
		}
	}

	private clientIp(request: RateLimitRequest) {
		const forwarded = request.headers?.["x-forwarded-for"];
		const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
		return (
			cleanTrackerValue(request.ip ?? request.ips?.[0] ?? forwardedIp ?? request.socket?.remoteAddress) ?? "unknown"
		);
	}
}

const cleanTrackerValue = (value: unknown) => {
	const normalized = String(value ?? "").trim();
	return normalized.length > 0 ? normalized.slice(0, 160) : undefined;
};

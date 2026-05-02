import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { auth } from "#modules/auth/auth.config";
import { PrismaService } from "#shared/database/prisma.service";
import { LogPlatformActionHandler } from "./log-platform-action.handler";

/**
 * Bridge-flow impersonation using Better Auth's admin plugin.
 *   1. Sign in as bridge user (role=admin) via auth.handler → capture Set-Cookie.
 *   2. Call POST /api/auth/admin/impersonate-user w/ bridge cookie + target userId → capture new Set-Cookie.
 *   3. Return that Set-Cookie string so Nest controller can forward it to browser.
 *
 * All cookies signed by Better Auth itself — no hand-rolled HMAC, no schema drift on Better Auth upgrades.
 */
@Injectable()
export class ImpersonateUserHandler {
	private readonly logger = new Logger(ImpersonateUserHandler.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(
		targetUserId: string,
		performedBy: string,
	): Promise<{ setCookieHeaders: string[]; redirectUrl: string }> {
		const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
		if (!target) throw new NotFoundException("User not found");

		const bridgeEmail = process.env.IMPERSONATE_BRIDGE_EMAIL;
		const bridgePassword = process.env.IMPERSONATE_BRIDGE_PASSWORD;
		if (!bridgeEmail || !bridgePassword) {
			throw new InternalServerErrorException(
				"Impersonation not configured: IMPERSONATE_BRIDGE_EMAIL + IMPERSONATE_BRIDGE_PASSWORD required. Run seed-impersonation-bridge.ts.",
			);
		}

		const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
		const webURL = process.env.FRONTEND_URL ?? "http://localhost:5173";

		// Step 1 — sign in as bridge user
		const signInReq = new Request(`${baseURL}/api/auth/sign-in/email`, {
			method: "POST",
			headers: { "content-type": "application/json", origin: baseURL },
			body: JSON.stringify({ email: bridgeEmail, password: bridgePassword }),
		});
		const signInResp = await auth.handler(signInReq);
		if (!signInResp.ok) {
			const errText = await signInResp.text().catch(() => "<no body>");
			throw new InternalServerErrorException(`Bridge sign-in failed (${signInResp.status}): ${errText.slice(0, 200)}`);
		}
		const bridgeCookie = signInResp.headers.get("set-cookie");
		if (!bridgeCookie) throw new InternalServerErrorException("Bridge sign-in returned no Set-Cookie header");

		// Step 2 — impersonate target user w/ bridge session
		const cookieHeader = bridgeCookie
			.split(",")
			.map((c) => c.trim().split(";")[0])
			.filter(Boolean)
			.join("; ");

		const impReq = new Request(`${baseURL}/api/auth/admin/impersonate-user`, {
			method: "POST",
			headers: { "content-type": "application/json", origin: baseURL, cookie: cookieHeader },
			body: JSON.stringify({ userId: targetUserId }),
		});
		const impResp = await auth.handler(impReq);
		if (!impResp.ok) {
			const errText = await impResp.text().catch(() => "<no body>");
			throw new InternalServerErrorException(`Impersonation failed (${impResp.status}): ${errText.slice(0, 400)}`);
		}

		// Collect all Set-Cookie values from impersonation response
		const setCookies: string[] = [];
		impResp.headers.forEach((v, k) => {
			if (k.toLowerCase() === "set-cookie") setCookies.push(v);
		});
		if (setCookies.length === 0) {
			throw new InternalServerErrorException("Impersonation response missing Set-Cookie");
		}

		await this.audit.execute({
			performedBy,
			action: "user.impersonate",
			targetType: "user",
			targetId: targetUserId,
			details: { targetUserEmail: target.email },
		});
		this.logger.warn(`Admin ${performedBy} impersonating user ${targetUserId} (${target.email})`);

		return { setCookieHeaders: setCookies, redirectUrl: `${webURL}/dashboard` };
	}
}

@Injectable()
export class ForcePasswordResetHandler {
	private readonly logger = new Logger(ForcePasswordResetHandler.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(targetUserId: string, performedBy: string) {
		const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
		if (!user) throw new NotFoundException("User not found");

		await this.prisma.session.deleteMany({ where: { userId: targetUserId } });

		try {
			const api = auth.api as unknown as {
				requestPasswordReset?: (input: { body: { email: string; redirectTo: string } }) => Promise<unknown>;
			};
			if (api.requestPasswordReset) {
				await api.requestPasswordReset({
					body: {
						email: user.email,
						redirectTo: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/login?reset=1`,
					},
				});
			} else {
				this.logger.warn("requestPasswordReset not available — sessions killed but no email sent");
			}
		} catch (e) {
			this.logger.warn(`requestPasswordReset failed: ${(e as Error).message}`);
		}

		await this.audit.execute({
			performedBy,
			action: "user.force-password-reset",
			targetType: "user",
			targetId: targetUserId,
			details: { targetUserEmail: user.email },
		});

		return { ok: true };
	}
}

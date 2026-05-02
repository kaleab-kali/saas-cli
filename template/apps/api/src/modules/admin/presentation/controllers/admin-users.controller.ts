import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";

import {
	ForcePasswordResetHandler,
	ImpersonateUserHandler,
} from "#modules/admin/application/commands/admin-user-actions.handlers";
import { ListUsersHandler } from "#modules/admin/application/queries/list-users.handler";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";

interface AdminReq {
	adminUser?: { id: string };
}

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/users")
@UseGuards(SuperAdminGuard)
export class AdminUsersController {
	constructor(
		private readonly listUsers: ListUsersHandler,
		private readonly impersonate: ImpersonateUserHandler,
		private readonly forceReset: ForcePasswordResetHandler,
	) {}

	@Get()
	@ApiOperation({ summary: "List all platform users with org memberships" })
	async list(@Query("page") page?: number, @Query("limit") limit?: number, @Query("search") search?: string) {
		return this.listUsers.execute({ page, limit, search });
	}

	@Get(":id/impersonate")
	@ApiOperation({
		summary:
			"Impersonate target user. Signs in as bridge admin → Better Auth issues impersonation session → forwards Set-Cookie + 302 to /dashboard.",
	})
	async impersonateUser(@Param("id") id: string, @Req() req: AdminReq, @Res() res: Response) {
		if (!req.adminUser?.id) {
			res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Admin session required" } });
			return;
		}
		const { setCookieHeaders, redirectUrl } = await this.impersonate.execute(id, req.adminUser.id);
		// Forward every Set-Cookie Better Auth issued (session_token + session_data + admin_session)
		for (const c of setCookieHeaders) {
			res.append("set-cookie", c);
		}
		res.redirect(302, redirectUrl);
	}

	@Post(":id/force-password-reset")
	@ApiOperation({ summary: "Kill all sessions and trigger password reset email" })
	async forcePasswordReset(@Param("id") id: string, @Req() req: AdminReq) {
		if (!req.adminUser?.id) {
			return { error: { code: "UNAUTHORIZED" } };
		}
		await this.forceReset.execute(id, req.adminUser.id);
		return { data: { ok: true } };
	}
}

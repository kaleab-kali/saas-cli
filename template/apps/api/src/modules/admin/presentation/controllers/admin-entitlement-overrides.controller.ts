import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { LogPlatformActionHandler } from "#modules/admin/application/commands/log-platform-action.handler";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { PrismaService } from "#shared/database/prisma.service";

interface AdminReq {
	adminUser?: { id: string };
}

interface GrantBody {
	organizationId: string;
	featureKey: string;
	enabled: boolean;
	limit?: number | null;
	expiresAt?: string | null;
	reason?: string;
}

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/entitlement-overrides")
@UseGuards(SuperAdminGuard)
export class AdminEntitlementOverridesController {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	@Get()
	@ApiOperation({ summary: "List overrides (optionally filter by org)" })
	async list(@Query("organizationId") orgId?: string) {
		const rows = await this.prisma.orgEntitlementOverride.findMany({
			where: orgId ? { organizationId: orgId } : undefined,
			orderBy: [{ organizationId: "asc" }, { featureKey: "asc" }],
		});
		return { data: rows };
	}

	@Post()
	@ApiOperation({ summary: "Grant/block a feature for an org" })
	async upsert(@Body() body: GrantBody, @Req() req: AdminReq) {
		const data = {
			organizationId: body.organizationId,
			featureKey: body.featureKey,
			enabled: body.enabled,
			limit: body.limit ?? null,
			expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
			reason: body.reason ?? null,
			grantedByUserId: req.adminUser?.id ?? null,
		};
		const row = await this.prisma.orgEntitlementOverride.upsert({
			where: {
				organizationId_featureKey: { organizationId: body.organizationId, featureKey: body.featureKey },
			},
			update: data,
			create: data,
		});
		if (req.adminUser?.id) {
			await this.audit.execute({
				performedBy: req.adminUser.id,
				action: "entitlement-override.upsert",
				targetType: "organization",
				targetId: body.organizationId,
				details: { featureKey: body.featureKey, enabled: body.enabled, limit: body.limit, reason: body.reason },
			});
		}
		return { data: row };
	}

	@Delete(":id")
	@ApiOperation({ summary: "Remove override (revert to plan default)" })
	async remove(@Param("id") id: string, @Req() req: AdminReq) {
		const row = await this.prisma.orgEntitlementOverride.delete({ where: { id } });
		if (req.adminUser?.id) {
			await this.audit.execute({
				performedBy: req.adminUser.id,
				action: "entitlement-override.remove",
				targetType: "organization",
				targetId: row.organizationId,
				details: { featureKey: row.featureKey },
			});
		}
		return { data: { ok: true } };
	}
}

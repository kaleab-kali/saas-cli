import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { EntitlementGuard } from "#modules/billing/presentation/guards/entitlement.guard";
import { RequireEntitlement } from "#modules/billing/presentation/guards/require-entitlement.decorator";
import { PrismaService } from "#shared/database/prisma.service";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateCustomRoleHandler } from "../../application/commands/create-custom-role.handler";
import {
	AssignCustomRoleHandler,
	DeleteCustomRoleHandler,
	UnassignCustomRoleHandler,
} from "../../application/commands/delete-custom-role.handler";
import { UpdateCustomRoleHandler } from "../../application/commands/update-custom-role.handler";
import { AssignRoleDto, CreateCustomRoleDto, UpdateCustomRoleDto } from "../../application/dto/role.dto";
import {
	GetCustomRoleHandler,
	GetPermissionMatrixHandler,
	GetSystemRolesHandler,
	ListCustomRolesHandler,
} from "../../application/queries/role.queries";

interface AuthedReq {
	organizationId: string;
	user?: { id: string; role?: string };
	session?: { user?: { id: string; role?: string }; roles?: string[] };
}

// Extract role slugs current user holds for this org. Session may not carry role — DB is source of truth.
const resolveUserRoles = async (prisma: PrismaService, organizationId: string, userId: string): Promise<string[]> => {
	const member = await prisma.member.findFirst({
		where: { organizationId, userId },
		select: { role: true },
	});
	const slugs: string[] = [];
	if (member?.role) {
		// member.role is comma-separated for users w/ multiple roles (Better Auth convention)
		for (const r of member.role
			.split(",")
			.map((x) => x.trim())
			.filter(Boolean))
			slugs.push(r);
	}
	// Also include custom role slugs assigned to user via CustomRoleAssignment
	const customRoles = await prisma.customRoleAssignment.findMany({
		where: { organizationId, userId },
		select: { customRole: { select: { slug: true } } },
	});
	for (const c of customRoles) if (c.customRole?.slug) slugs.push(c.customRole.slug);
	return slugs;
};

@ApiTags("Roles")
@Controller("roles")
@UseGuards(AuthGuard, PermissionsGuard, EntitlementGuard)
export class RoleController {
	constructor(
		private readonly list: ListCustomRolesHandler,
		private readonly get: GetCustomRoleHandler,
		private readonly create: CreateCustomRoleHandler,
		private readonly update: UpdateCustomRoleHandler,
		private readonly del: DeleteCustomRoleHandler,
		private readonly assign: AssignCustomRoleHandler,
		private readonly unassign: UnassignCustomRoleHandler,
		private readonly matrix: GetPermissionMatrixHandler,
		private readonly systemRoles: GetSystemRolesHandler,
		private readonly prisma: PrismaService,
	) {}

	@Get("matrix")
	@RequirePermissions("custom-role:read")
	matrixEndpoint() {
		return { data: this.matrix.execute() };
	}

	@Get("system")
	@RequirePermissions("custom-role:read")
	system() {
		return { data: this.systemRoles.execute() };
	}

	@Get()
	@RequirePermissions("custom-role:read")
	async listRoles(@Query("includeInactive") includeInactive: string | undefined, @Req() req: AuthedReq) {
		return { data: await this.list.execute(req.organizationId, includeInactive === "true") };
	}

	@Get(":id")
	@RequirePermissions("custom-role:read")
	async getOne(@Param("id") id: string, @Req() req: AuthedReq) {
		return { data: await this.get.execute(req.organizationId, id) };
	}

	@Post()
	@RequirePermissions("custom-role:create")
	@RequireEntitlement("platform.custom-roles")
	async createRole(@Body() dto: CreateCustomRoleDto, @Req() req: AuthedReq) {
		const userId = req.user?.id ?? req.session?.user?.id ?? "system";
		const roleSlugs = await resolveUserRoles(this.prisma, req.organizationId, userId);
		return { data: await this.create.execute(req.organizationId, userId, roleSlugs, dto) };
	}

	@Patch(":id")
	@RequirePermissions("custom-role:update")
	@RequireEntitlement("platform.custom-roles")
	async updateRole(@Param("id") id: string, @Body() dto: UpdateCustomRoleDto, @Req() req: AuthedReq) {
		const userId = req.user?.id ?? req.session?.user?.id ?? "system";
		const roleSlugs = await resolveUserRoles(this.prisma, req.organizationId, userId);
		return { data: await this.update.execute(req.organizationId, id, roleSlugs, dto) };
	}

	@Delete(":id")
	@RequirePermissions("custom-role:delete")
	@RequireEntitlement("platform.custom-roles")
	async deleteRole(@Param("id") id: string, @Req() req: AuthedReq) {
		return { data: await this.del.execute(req.organizationId, id) };
	}

	@Post(":id/assignments")
	@RequirePermissions("custom-role:assign")
	@RequireEntitlement("platform.custom-roles")
	async assignUser(@Param("id") id: string, @Body() dto: AssignRoleDto, @Req() req: AuthedReq) {
		const assignedBy = req.user?.id ?? req.session?.user?.id ?? "system";
		return { data: await this.assign.execute(req.organizationId, id, dto.userId, assignedBy) };
	}

	@Delete(":id/assignments/:userId")
	@RequirePermissions("custom-role:assign")
	@RequireEntitlement("platform.custom-roles")
	async unassignUser(@Param("id") id: string, @Param("userId") userId: string, @Req() req: AuthedReq) {
		return { data: await this.unassign.execute(req.organizationId, id, userId) };
	}
}

import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { InviteMemberDto, UpdateMemberRoleDto } from "../application/team.dto";
import { TeamService } from "../application/team.service";

interface AuthedReq {
	organizationId: string;
	user?: { id: string; email?: string };
	session?: { user?: { id: string; email?: string }; userId?: string };
}

const currentUser = (req: AuthedReq) => {
	const id = req.user?.id ?? req.session?.user?.id ?? req.session?.userId;
	const email = req.user?.email ?? req.session?.user?.email;
	return { id, email };
};

@ApiTags("Team")
@Controller("team")
@UseGuards(AuthGuard, PermissionsGuard)
export class TeamController {
	constructor(private readonly team: TeamService) {}

	@Get("members")
	@RequirePermissions("member:read")
	@ApiOperation({ summary: "List active organization members" })
	async members(@Req() req: AuthedReq) {
		return { data: await this.team.listMembers(req.organizationId) };
	}

	@Get("invitations")
	@RequirePermissions("member:read")
	@ApiOperation({ summary: "List organization invitations" })
	async invitations(@Req() req: AuthedReq) {
		return { data: await this.team.listInvitations(req.organizationId) };
	}

	@Post("invitations")
	@RequirePermissions("member:create")
	@ApiOperation({ summary: "Invite a member to the active organization" })
	async invite(@Req() req: AuthedReq, @Body() dto: InviteMemberDto) {
		const user = currentUser(req);
		const data = await this.team.invite(req.organizationId, user.id ?? "system", dto);
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
		return { data: { ...data, acceptUrl: `${frontendUrl}/settings/members?invitationId=${data.id}` } };
	}

	@Delete("invitations/:id")
	@RequirePermissions("member:delete")
	@ApiOperation({ summary: "Cancel a pending invitation" })
	async cancelInvitation(@Req() req: AuthedReq, @Param("id") id: string) {
		return { data: await this.team.cancelInvitation(req.organizationId, id) };
	}

	@Post("invitations/:id/accept")
	@ApiOperation({ summary: "Accept an invitation as the current user" })
	async accept(@Req() req: AuthedReq, @Param("id") id: string) {
		const user = currentUser(req);
		if (!user.id || !user.email) throw new BadRequestException("authenticated user email is required");
		return { data: await this.team.acceptInvitation(id, { id: user.id, email: user.email }) };
	}

	@Patch("members/:id")
	@RequirePermissions("member:update")
	@ApiOperation({ summary: "Update a member role" })
	async updateMember(@Req() req: AuthedReq, @Param("id") id: string, @Body() dto: UpdateMemberRoleDto) {
		return { data: await this.team.updateMemberRole(req.organizationId, id, dto.role) };
	}

	@Delete("members/:id")
	@RequirePermissions("member:delete")
	@ApiOperation({ summary: "Remove a member from the organization" })
	async removeMember(@Req() req: AuthedReq, @Param("id") id: string) {
		return { data: await this.team.removeMember(req.organizationId, id) };
	}
}

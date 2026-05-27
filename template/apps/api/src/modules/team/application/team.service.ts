import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { UsageTrackerService } from "#modules/billing/application/services/usage-tracker.service";
import { PrismaService } from "#shared/database/prisma.service";
import type { InviteMemberDto, TeamRole } from "./team.dto";

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class TeamService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly usage: UsageTrackerService,
	) {}

	async listMembers(organizationId: string) {
		return this.prisma.member.findMany({
			where: { organizationId },
			include: { user: { select: { id: true, name: true, email: true, image: true } } },
			orderBy: { createdAt: "asc" },
		});
	}

	async listInvitations(organizationId: string) {
		return this.prisma.invitation.findMany({
			where: { organizationId },
			orderBy: { createdAt: "desc" },
			take: 100,
		});
	}

	async invite(organizationId: string, inviterId: string, dto: InviteMemberDto) {
		const email = dto.email.toLowerCase().trim();
		const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
		if (existingUser) {
			const existingMember = await this.prisma.member.findFirst({
				where: { organizationId, userId: existingUser.id },
			});
			if (existingMember) throw new ConflictException("user is already a member");
		}
		const pending = await this.prisma.invitation.findFirst({
			where: { organizationId, email, status: "pending" },
		});
		if (pending) return pending;
		await this.usage.assertCanCreate(organizationId, "user");
		const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
		return this.prisma.invitation.create({
			data: {
				id: createId(),
				organizationId,
				email,
				role: dto.role,
				status: "pending",
				expiresAt,
				inviterId,
			},
		});
	}

	async updateMemberRole(organizationId: string, memberId: string, role: TeamRole) {
		const member = await this.prisma.member.findFirst({ where: { id: memberId, organizationId } });
		if (!member) throw new NotFoundException("member");
		if (member.role === "owner" && role !== "owner") {
			const ownerCount = await this.prisma.member.count({ where: { organizationId, role: "owner" } });
			if (ownerCount <= 1) throw new BadRequestException("cannot demote the last owner");
		}
		return this.prisma.member.update({ where: { id: memberId }, data: { role } });
	}

	async removeMember(organizationId: string, memberId: string) {
		const member = await this.prisma.member.findFirst({ where: { id: memberId, organizationId } });
		if (!member) throw new NotFoundException("member");
		if (member.role === "owner") {
			const ownerCount = await this.prisma.member.count({ where: { organizationId, role: "owner" } });
			if (ownerCount <= 1) throw new BadRequestException("cannot remove the last owner");
		}
		await this.prisma.member.delete({ where: { id: memberId } });
		return { id: memberId };
	}

	async cancelInvitation(organizationId: string, invitationId: string) {
		const invitation = await this.prisma.invitation.findFirst({ where: { id: invitationId, organizationId } });
		if (!invitation) throw new NotFoundException("invitation");
		return this.prisma.invitation.update({ where: { id: invitationId }, data: { status: "cancelled" } });
	}

	async acceptInvitation(invitationId: string, user: { id: string; email: string }) {
		const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
		if (!invitation) throw new NotFoundException("invitation");
		if (invitation.status !== "pending") throw new BadRequestException("invitation is not pending");
		if (invitation.expiresAt <= new Date()) throw new BadRequestException("invitation expired");
		if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
			throw new BadRequestException("invitation email does not match current user");
		}
		const existing = await this.prisma.member.findFirst({
			where: { organizationId: invitation.organizationId, userId: user.id },
		});
		if (!existing) {
			await this.usage.assertCanCreate(invitation.organizationId, "user");
			await this.prisma.member.create({
				data: {
					id: createId(),
					organizationId: invitation.organizationId,
					userId: user.id,
					role: invitation.role || "member",
				},
			});
		}
		return this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: "accepted" } });
	}
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";

@Injectable()
export class SuspendOrganizationHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(orgId: string, performedBy: string, reason?: string): Promise<void> {
		const org = await this.prisma.organization.findUnique({
			where: { id: orgId },
			include: { members: { select: { userId: true } } },
		});

		if (!org) {
			throw new NotFoundException("Organization not found");
		}

		const now = new Date();
		const userIds = org.members.map((m) => m.userId);

		await this.prisma.$transaction([
			this.prisma.organization.update({
				where: { id: orgId },
				data: { suspendedAt: now, suspendReason: reason ?? null },
			}),
			this.prisma.subscription.updateMany({
				where: { organizationId: orgId },
				data: { status: "suspended" },
			}),
			this.prisma.session.deleteMany({ where: { userId: { in: userIds } } }),
			this.prisma.platformAuditLog.create({
				data: {
					action: "org.suspended",
					performedBy,
					targetType: "organization",
					targetId: orgId,
					details: {
						reason,
						orgName: org.name,
						memberCount: org.members.length,
						userIds,
					} as unknown as Prisma.InputJsonValue,
				},
			}),
		]);
	}
}

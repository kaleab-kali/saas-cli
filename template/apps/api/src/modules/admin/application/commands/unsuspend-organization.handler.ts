import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";

@Injectable()
export class UnsuspendOrganizationHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(orgId: string, performedBy: string): Promise<void> {
		const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
		if (!org) throw new NotFoundException("Organization not found");

		await this.prisma.$transaction([
			this.prisma.organization.update({
				where: { id: orgId },
				data: { suspendedAt: null, suspendReason: null },
			}),
			this.prisma.subscription.updateMany({
				where: { organizationId: orgId, status: "suspended" },
				data: { status: "active" },
			}),
			this.prisma.platformAuditLog.create({
				data: {
					action: "org.unsuspended",
					performedBy,
					targetType: "organization",
					targetId: orgId,
					details: { orgName: org.name } as unknown as Prisma.InputJsonValue,
				},
			}),
		]);
	}
}

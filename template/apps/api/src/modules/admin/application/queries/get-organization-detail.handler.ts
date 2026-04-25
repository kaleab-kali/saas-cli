import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

export interface OrgDetail {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	metadata: string | null;
	createdAt: Date;
	suspendedAt: Date | null;
	suspendReason: string | null;
	members: {
		id: string;
		userId: string;
		role: string;
		createdAt: Date;
		user: { id: string; name: string; email: string };
	}[];
	stats: { memberCount: number; invitationCount: number };
}

@Injectable()
export class GetOrganizationDetailHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(orgId: string): Promise<OrgDetail> {
		const org = await this.prisma.organization.findUnique({
			where: { id: orgId },
			include: {
				members: {
					include: {
						user: { select: { id: true, name: true, email: true } },
					},
					orderBy: { createdAt: "asc" },
				},
				_count: { select: { members: true, invitations: true } },
			},
		});

		if (!org) {
			throw new NotFoundException("Organization not found");
		}

		return {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo,
			metadata: org.metadata,
			createdAt: org.createdAt,
			suspendedAt: org.suspendedAt,
			suspendReason: org.suspendReason,
			members: org.members,
			stats: {
				memberCount: org._count.members,
				invitationCount: org._count.invitations,
			},
		};
	}
}

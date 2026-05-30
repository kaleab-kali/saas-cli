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
	subscription: {
		id: string;
		status: string;
		billingInterval: string;
		currency: string;
		currentPeriodEnd: Date;
		plan: { slug: string; nameEn: string };
	} | null;
	usage: { userCount: number; apiCallCount: number; emailCount: number; metricsJson: unknown } | null;
	stats: {
		memberCount: number;
		invitationCount: number;
		apiKeyCount: number;
		savedReportCount: number;
		notificationCount: number;
		auditLogCount: number;
	};
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

		const [subscription, usage, apiKeyCount, savedReportCount, notificationCount, auditLogCount] = await Promise.all([
			this.prisma.subscription.findUnique({
				where: { organizationId: orgId },
				select: {
					id: true,
					status: true,
					billingInterval: true,
					currency: true,
					currentPeriodEnd: true,
					plan: { select: { slug: true, nameEn: true } },
				},
			}),
			this.prisma.usageSnapshot.findFirst({
				where: { organizationId: orgId },
				orderBy: { snapshotDate: "desc" },
				select: { userCount: true, apiCallCount: true, emailCount: true, metricsJson: true },
			}),
			this.prisma.apiKey.count({ where: { organizationId: orgId, revokedAt: null } }),
			this.prisma.savedReport.count({ where: { organizationId: orgId } }),
			this.prisma.notification.count({ where: { organizationId: orgId } }),
			this.prisma.auditLog.count({ where: { organizationId: orgId } }),
		]);

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
			subscription,
			usage,
			stats: {
				memberCount: org._count.members,
				invitationCount: org._count.invitations,
				apiKeyCount,
				savedReportCount,
				notificationCount,
				auditLogCount,
			},
		};
	}
}

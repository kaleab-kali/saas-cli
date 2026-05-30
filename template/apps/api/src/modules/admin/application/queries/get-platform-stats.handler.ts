import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

export interface PlatformStats {
	totalOrganizations: number;
	totalUsers: number;
	newOrgsLast7Days: number;
	newUsersLast7Days: number;
	activeSessionsLast24h: number;
	orgsByMemberCount: { orgName: string; memberCount: number }[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TOP_ORGS_LIMIT = 10;

@Injectable()
export class GetPlatformStatsHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(): Promise<PlatformStats> {
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
		const oneDayAgo = new Date(now.getTime() - ONE_DAY_MS);

		const [totalOrganizations, totalUsers, newOrgsLast7Days, newUsersLast7Days, activeSessionsLast24h, topOrgs] =
			await Promise.all([
				this.prisma.organization.count(),
				this.prisma.user.count(),
				this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
				this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
				this.prisma.session.count({ where: { updatedAt: { gte: oneDayAgo } } }),
				this.prisma.organization.findMany({
					select: {
						name: true,
						_count: { select: { members: true } },
					},
					orderBy: { members: { _count: "desc" } },
					take: TOP_ORGS_LIMIT,
				}),
			]);

		return {
			totalOrganizations,
			totalUsers,
			newOrgsLast7Days,
			newUsersLast7Days,
			activeSessionsLast24h,
			orgsByMemberCount: topOrgs.map((org) => ({
				orgName: org.name,
				memberCount: org._count.members,
			})),
		};
	}
}

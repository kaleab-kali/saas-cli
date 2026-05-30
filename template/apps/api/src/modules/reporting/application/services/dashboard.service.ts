import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async main(organizationId: string) {
		const [memberCount, notificationCount, savedReportCount, apiKeyCount] = await Promise.all([
			this.prisma.member.count({ where: { organizationId, removedAt: null } }),
			this.prisma.notification.count({ where: { organizationId } }),
			this.prisma.savedReport.count({ where: { organizationId } }),
			this.prisma.apiKey.count({ where: { organizationId, revokedAt: null } }),
		]);

		return {
			kpis: {
				memberCount,
				notificationCount,
				savedReportCount,
				apiKeyCount,
			},
		};
	}
}

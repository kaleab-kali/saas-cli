import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { UsageSnapshot } from "../../domain/entities/usage-snapshot.entity";
import { UsageSnapshotRepository } from "../../domain/repositories/usage-snapshot.repository";

@Injectable()
export class PrismaUsageSnapshotRepository extends UsageSnapshotRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(s: UsageSnapshot) {
		const p = s.toPrimitives();
		const row = await this.prisma.usageSnapshot.create({
			data: {
				subscriptionId: p.subscriptionId,
				organizationId: p.organizationId,
				snapshotDate: p.snapshotDate,
				userCount: p.userCount,
				apiCallCount: p.apiCallCount,
				emailCount: p.emailCount,
				metricsJson: p.metricsJson ?? undefined,
			},
		});
		return UsageSnapshot.rehydrate(row);
	}

	async findLatestByOrg(organizationId: string) {
		const row = await this.prisma.usageSnapshot.findFirst({
			where: { organizationId },
			orderBy: { snapshotDate: "desc" },
		});
		return row ? UsageSnapshot.rehydrate(row) : null;
	}

	async listByOrg(organizationId: string, take: number) {
		const rows = await this.prisma.usageSnapshot.findMany({
			where: { organizationId },
			orderBy: { snapshotDate: "desc" },
			take,
		});
		return rows.map(UsageSnapshot.rehydrate);
	}
}

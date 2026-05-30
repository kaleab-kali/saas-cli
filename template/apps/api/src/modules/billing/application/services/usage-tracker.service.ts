import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { UsageSnapshot } from "../../domain/entities/usage-snapshot.entity";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { UsageSnapshotRepository } from "../../domain/repositories/usage-snapshot.repository";

/**
 * UsageTrackerService — generic per-org usage.
 *
 * Skeleton tracks userCount only. Add custom metrics (your domain entities)
 * by extending `getCurrent` to return additional counts inside `metricsJson`.
 * The `userCap` on Plan enforces seat limits.
 */
export interface UsageCurrent {
	userCount: number;
	apiCallCount: number;
	emailCount: number;
	apiKeyCount: number;
	fileCount: number;
	storageBytes: number;
	savedReportCount: number;
	reportScheduleCount: number;
	caps: {
		users: number | null;
		apiKeys: number | null;
		files: number | null;
		storageBytes: number | null;
		savedReports: number | null;
		reportSchedules: number | null;
	};
	usagePct: {
		users: number;
		apiKeys: number;
		files: number;
		storageBytes: number;
		savedReports: number;
		reportSchedules: number;
	};
	metrics: Record<string, number>;
}

@Injectable()
export class UsageTrackerService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly subRepo: SubscriptionRepository,
		private readonly planRepo: PlanRepository,
		private readonly snapshotRepo: UsageSnapshotRepository,
	) {}

	async getCurrent(organizationId: string): Promise<UsageCurrent> {
		const [users, apiKeys, files, storage, savedReports, reportSchedules] = await Promise.all([
			this.prisma.member.count({ where: { organizationId, removedAt: null } }),
			this.prisma.apiKey.count({ where: { organizationId, revokedAt: null } }),
			this.prisma.fileAsset.count({ where: { organizationId } }),
			this.prisma.fileAsset.aggregate({ where: { organizationId }, _sum: { size: true } }),
			this.prisma.savedReport.count({ where: { organizationId } }),
			this.prisma.reportSchedule.count({ where: { organizationId, enabled: true } }),
		]);
		const sub = await this.subRepo.findByOrg(organizationId);
		let caps: UsageCurrent["caps"] = {
			users: null,
			apiKeys: null,
			files: null,
			storageBytes: null,
			savedReports: null,
			reportSchedules: null,
		};
		if (sub) {
			const plan = await this.planRepo.findById(sub.toPrimitives().planId);
			if (plan) {
				const p = plan.toPrimitives();
				caps = {
					users: p.userCap,
					apiKeys: plan.featureLimit("platform.api-keys"),
					files: plan.featureLimit("platform.file-count"),
					storageBytes: plan.featureLimit("platform.storage-bytes"),
					savedReports: plan.featureLimit("reporting.custom-report-builder"),
					reportSchedules: plan.featureLimit("reporting.schedule-delivery"),
				};
			}
		}
		const pct = (v: number, cap: number | null) => (cap ? Math.round((v / cap) * 100) : 0);
		const storageBytes = storage._sum.size ?? 0;
		return {
			userCount: users,
			apiCallCount: 0,
			emailCount: 0,
			apiKeyCount: apiKeys,
			fileCount: files,
			storageBytes,
			savedReportCount: savedReports,
			reportScheduleCount: reportSchedules,
			caps,
			usagePct: {
				users: pct(users, caps.users),
				apiKeys: pct(apiKeys, caps.apiKeys),
				files: pct(files, caps.files),
				storageBytes: pct(storageBytes, caps.storageBytes),
				savedReports: pct(savedReports, caps.savedReports),
				reportSchedules: pct(reportSchedules, caps.reportSchedules),
			},
			metrics: {
				apiKeys,
				files,
				storageBytes,
				savedReports,
				reportSchedules,
			},
		};
	}

	async assertCanCreate(organizationId: string, kind: "user"): Promise<void> {
		const cur = await this.getCurrent(organizationId);
		const cap = kind === "user" ? cur.caps.users : null;
		const count = kind === "user" ? cur.userCount : 0;
		if (cap !== null && count >= cap) {
			throw new ForbiddenException({
				code: "USAGE_CAP_EXCEEDED",
				message: `${kind} cap (${cap}) exceeded for current plan. Upgrade to add more.`,
				kind,
				cap,
				current: count,
			});
		}
	}

	async takeSnapshot(organizationId: string): Promise<UsageSnapshot> {
		const sub = await this.subRepo.findByOrg(organizationId);
		if (!sub) throw new ForbiddenException("no subscription");
		const cur = await this.getCurrent(organizationId);
		const snapshot = UsageSnapshot.create({
			id: "",
			subscriptionId: sub.id,
			organizationId,
			snapshotDate: new Date(),
			userCount: cur.userCount,
			apiCallCount: cur.apiCallCount,
			emailCount: cur.emailCount,
			metricsJson: cur.metrics,
			createdAt: new Date(),
		});
		return this.snapshotRepo.save(snapshot);
	}
}

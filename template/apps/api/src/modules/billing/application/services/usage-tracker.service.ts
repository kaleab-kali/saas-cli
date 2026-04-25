import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { UsageSnapshot } from "../../domain/entities/usage-snapshot.entity";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { SubscriptionRepository } from "../../domain/repositories/subscription.repository";
import { UsageSnapshotRepository } from "../../domain/repositories/usage-snapshot.repository";

export interface UsageCurrent {
	buildingCount: number;
	unitCount: number;
	userCount: number;
	caps: { buildings: number | null; units: number | null; users: number | null };
	usagePct: { buildings: number; units: number; users: number };
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
		// Skeleton: building/unit counts are placeholders until you add domain models.
		const [buildings, units, users] = await Promise.all([
			Promise.resolve(0),
			Promise.resolve(0),
			this.prisma.member.count({ where: { organizationId } }),
		]);
		const sub = await this.subRepo.findByOrg(organizationId);
		let caps: UsageCurrent["caps"] = { buildings: null, units: null, users: null };
		if (sub) {
			const plan = await this.planRepo.findById(sub.toPrimitives().planId);
			if (plan) {
				const p = plan.toPrimitives();
				caps = { buildings: p.buildingCap, units: p.unitCap, users: p.userCap };
			}
		}
		const pct = (v: number, cap: number | null) => (cap ? Math.round((v / cap) * 100) : 0);
		return {
			buildingCount: buildings,
			unitCount: units,
			userCount: users,
			caps,
			usagePct: {
				buildings: pct(buildings, caps.buildings),
				units: pct(units, caps.units),
				users: pct(users, caps.users),
			},
		};
	}

	async assertCanCreate(organizationId: string, kind: "building" | "unit" | "user"): Promise<void> {
		const cur = await this.getCurrent(organizationId);
		const cap = kind === "building" ? cur.caps.buildings : kind === "unit" ? cur.caps.units : cur.caps.users;
		const count = kind === "building" ? cur.buildingCount : kind === "unit" ? cur.unitCount : cur.userCount;
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
			buildingCount: cur.buildingCount,
			unitCount: cur.unitCount,
			userCount: cur.userCount,
			apiCallCount: 0,
			smsCount: 0,
			emailCount: 0,
			createdAt: new Date(),
		});
		return this.snapshotRepo.save(snapshot);
	}
}

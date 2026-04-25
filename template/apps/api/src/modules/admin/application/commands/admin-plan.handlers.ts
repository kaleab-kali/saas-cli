import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { LogPlatformActionHandler } from "./log-platform-action.handler";

export interface CreatePlanInput {
	slug: string;
	nameEn: string;
	nameAm: string;
	description?: string | null;
	priceMonthlyMinor: number;
	priceAnnualMinor: number;
	currency?: string;
	userCap?: number | null;
	supportSlaHours: number;
	stripeSupported?: boolean;
	stripePriceIdMonthly?: string | null;
	stripePriceIdAnnual?: string | null;
	chapaSupported?: boolean;
	manualSupported?: boolean;
	sortOrder?: number;
	active?: boolean;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {}

export interface EntitlementInput {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

@Injectable()
export class CreatePlanHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(input: CreatePlanInput, performedBy?: string) {
		const existing = await this.prisma.plan.findUnique({ where: { slug: input.slug } });
		if (existing) throw new BadRequestException(`plan with slug '${input.slug}' exists`);
		const plan = await this.prisma.plan.create({
			data: {
				slug: input.slug,
				nameEn: input.nameEn,
				nameAm: input.nameAm,
				description: input.description ?? null,
				priceMonthlyMinor: input.priceMonthlyMinor,
				priceAnnualMinor: input.priceAnnualMinor,
				currency: input.currency ?? "USD",
				userCap: input.userCap ?? null,
				supportSlaHours: input.supportSlaHours,
				stripeSupported: input.stripeSupported ?? true,
				stripePriceIdMonthly: input.stripePriceIdMonthly ?? null,
				stripePriceIdAnnual: input.stripePriceIdAnnual ?? null,
				chapaSupported: input.chapaSupported ?? false,
				manualSupported: input.manualSupported ?? true,
				sortOrder: input.sortOrder ?? 0,
				active: input.active ?? true,
			},
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "plan.create",
				targetType: "plan",
				targetId: plan.id,
				details: { after: plan as unknown as Record<string, unknown> },
			});
		}
		return plan;
	}
}

@Injectable()
export class UpdatePlanHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(id: string, input: UpdatePlanInput, performedBy?: string) {
		const before = await this.prisma.plan.findUnique({ where: { id } });
		if (!before) throw new NotFoundException("plan not found");
		const after = await this.prisma.plan.update({ where: { id }, data: input });
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "plan.update",
				targetType: "plan",
				targetId: id,
				details: {
					before: before as unknown as Record<string, unknown>,
					after: after as unknown as Record<string, unknown>,
				},
			});
		}
		return after;
	}
}

@Injectable()
export class ArchivePlanHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(id: string, performedBy?: string) {
		const subCount = await this.prisma.subscription.count({
			where: { planId: id, status: { in: ["active", "trialing", "past_due", "grace", "read_only"] } },
		});
		if (subCount > 0) {
			throw new BadRequestException(`cannot archive plan: ${subCount} active subscription(s) still on it`);
		}
		const plan = await this.prisma.plan.update({ where: { id }, data: { active: false } });
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "plan.archive",
				targetType: "plan",
				targetId: id,
				details: { after: plan as unknown as Record<string, unknown> },
			});
		}
		return plan;
	}
}

@Injectable()
export class UpsertEntitlementHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(planId: string, input: EntitlementInput, performedBy?: string) {
		const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
		if (!plan) throw new NotFoundException("plan not found");
		const row = await this.prisma.featureEntitlement.upsert({
			where: { planId_featureKey: { planId, featureKey: input.featureKey } },
			update: { enabled: input.enabled, limit: input.limit },
			create: { planId, featureKey: input.featureKey, enabled: input.enabled, limit: input.limit },
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "entitlement.upsert",
				targetType: "plan",
				targetId: planId,
				details: { after: row as unknown as Record<string, unknown> },
			});
		}
		return row;
	}

	async executeBulk(planId: string, entitlements: EntitlementInput[], performedBy?: string) {
		const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
		if (!plan) throw new NotFoundException("plan not found");
		await this.prisma.$transaction(
			entitlements.map((e) =>
				this.prisma.featureEntitlement.upsert({
					where: { planId_featureKey: { planId, featureKey: e.featureKey } },
					update: { enabled: e.enabled, limit: e.limit },
					create: { planId, featureKey: e.featureKey, enabled: e.enabled, limit: e.limit },
				}),
			),
		);
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "entitlement.bulk-upsert",
				targetType: "plan",
				targetId: planId,
				details: { count: entitlements.length },
			});
		}
		return { count: entitlements.length };
	}
}

@Injectable()
export class ListAdminPlansHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(includeInactive: boolean) {
		return this.prisma.plan.findMany({
			where: includeInactive ? {} : { active: true },
			include: { entitlements: { orderBy: { featureKey: "asc" } } },
			orderBy: { sortOrder: "asc" },
		});
	}

	async getById(id: string) {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
			include: { entitlements: { orderBy: { featureKey: "asc" } } },
		});
		if (!plan) throw new NotFoundException("plan not found");
		return plan;
	}
}

import type { FeatureEntitlement as PrismaEntitlement, Plan as PrismaPlan } from "../../../../generated/prisma/client";
import { Plan } from "../../domain/entities/plan.entity";
import type { PlanSlug } from "../../domain/value-objects/feature-keys.vo";

export class PlanMapper {
	static toDomain(row: PrismaPlan & { entitlements: PrismaEntitlement[] }): Plan {
		return Plan.rehydrate({
			id: row.id,
			slug: row.slug as PlanSlug,
			nameEn: row.nameEn,
			nameAm: row.nameAm,
			priceMonthlyEtb: row.priceMonthlyEtb,
			priceAnnualEtb: row.priceAnnualEtb,
			priceCampaignDailyEtb: row.priceCampaignDailyEtb,
			buildingCap: row.buildingCap,
			unitCap: row.unitCap,
			userCap: row.userCap,
			supportSlaHours: row.supportSlaHours,
			active: row.active,
			sortOrder: row.sortOrder,
			entitlements: row.entitlements.map((e) => ({ featureKey: e.featureKey, enabled: e.enabled, limit: e.limit })),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(plan: Plan) {
		return plan.toPrimitives();
	}
}

import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

// Generic skeleton plans. Replace `entitlements` with your app's feature keys.
type Ent = { featureKey: string; enabled: boolean; limit?: number | null };

type PlanSpec = {
	slug: string;
	nameEn: string;
	nameAm: string;
	priceMonthlyEtb: number;
	priceAnnualEtb: number;
	priceCampaignDailyEtb: number | null;
	buildingCap: number | null;
	unitCap: number | null;
	userCap: number | null;
	supportSlaHours: number;
	sortOrder: number;
	entitlements: Ent[];
};

const PLANS: PlanSpec[] = [
	{
		slug: "starter",
		nameEn: "Starter",
		nameAm: "Starter",
		priceMonthlyEtb: 0,
		priceAnnualEtb: 0,
		priceCampaignDailyEtb: null,
		buildingCap: null,
		unitCap: null,
		userCap: 5,
		supportSlaHours: 48,
		sortOrder: 1,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "api.keys", enabled: false },
		],
	},
	{
		slug: "growth",
		nameEn: "Growth",
		nameAm: "Growth",
		priceMonthlyEtb: 4900,
		priceAnnualEtb: 49000,
		priceCampaignDailyEtb: null,
		buildingCap: null,
		unitCap: null,
		userCap: 25,
		supportSlaHours: 24,
		sortOrder: 2,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "api.keys", enabled: true, limit: 5 },
		],
	},
	{
		slug: "enterprise",
		nameEn: "Enterprise",
		nameAm: "Enterprise",
		priceMonthlyEtb: 19900,
		priceAnnualEtb: 199000,
		priceCampaignDailyEtb: null,
		buildingCap: null,
		unitCap: null,
		userCap: null,
		supportSlaHours: 4,
		sortOrder: 3,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "api.keys", enabled: true },
			{ featureKey: "custom.roles", enabled: true },
			{ featureKey: "audit.export", enabled: true },
		],
	},
];

const seedPlans = async () => {
	for (const plan of PLANS) {
		const created = await prisma.plan.upsert({
			where: { slug: plan.slug },
			update: {
				nameEn: plan.nameEn,
				nameAm: plan.nameAm,
				priceMonthlyEtb: plan.priceMonthlyEtb,
				priceAnnualEtb: plan.priceAnnualEtb,
				priceCampaignDailyEtb: plan.priceCampaignDailyEtb,
				buildingCap: plan.buildingCap,
				unitCap: plan.unitCap,
				userCap: plan.userCap,
				supportSlaHours: plan.supportSlaHours,
				sortOrder: plan.sortOrder,
				active: true,
			},
			create: {
				slug: plan.slug,
				nameEn: plan.nameEn,
				nameAm: plan.nameAm,
				priceMonthlyEtb: plan.priceMonthlyEtb,
				priceAnnualEtb: plan.priceAnnualEtb,
				priceCampaignDailyEtb: plan.priceCampaignDailyEtb,
				buildingCap: plan.buildingCap,
				unitCap: plan.unitCap,
				userCap: plan.userCap,
				supportSlaHours: plan.supportSlaHours,
				sortOrder: plan.sortOrder,
				active: true,
			},
		});
		await prisma.featureEntitlement.deleteMany({ where: { planId: created.id } });
		for (const e of plan.entitlements) {
			await prisma.featureEntitlement.create({
				data: {
					planId: created.id,
					featureKey: e.featureKey,
					enabled: e.enabled,
					limit: e.limit ?? null,
				},
			});
		}
		console.log(`  ${plan.slug}: ${plan.entitlements.length} entitlements`);
	}
	console.log("Plans seeded.");
};

seedPlans()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

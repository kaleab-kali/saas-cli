import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

// Generic skeleton plans. Replace `entitlements` with your app's feature keys.
type Ent = { featureKey: string; enabled: boolean; limit?: number | null };

type PlanSpec = {
	slug: string;
	nameEn: string;
	nameAm: string;
	description: string | null;
	priceMonthlyMinor: number;
	priceAnnualMinor: number;
	currency: string;
	userCap: number | null;
	supportSlaHours: number;
	stripeSupported: boolean;
	chapaSupported: boolean;
	manualSupported: boolean;
	sortOrder: number;
	entitlements: Ent[];
};

const PLANS: PlanSpec[] = [
	{
		slug: "free",
		nameEn: "Free",
		nameAm: "Free",
		description: "Get started, no card required.",
		priceMonthlyMinor: 0,
		priceAnnualMinor: 0,
		currency: "USD",
		userCap: 5,
		supportSlaHours: 48,
		stripeSupported: true,
		chapaSupported: true,
		manualSupported: true,
		sortOrder: 1,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "platform.api-keys", enabled: false },
			{ featureKey: "platform.custom-roles", enabled: false },
		],
	},
	{
		slug: "pro",
		nameEn: "Pro",
		nameAm: "Pro",
		description: "For growing teams.",
		priceMonthlyMinor: 4900,
		priceAnnualMinor: 49000,
		currency: "USD",
		userCap: 25,
		supportSlaHours: 24,
		stripeSupported: true,
		chapaSupported: true,
		manualSupported: true,
		sortOrder: 2,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "platform.api-keys", enabled: true, limit: 5 },
			{ featureKey: "platform.custom-fields", enabled: true, limit: 50 },
			{ featureKey: "reporting.custom-report-builder", enabled: true, limit: 25 },
		],
	},
	{
		slug: "enterprise",
		nameEn: "Enterprise",
		nameAm: "Enterprise",
		description: "Org-wide compliance, support, audit.",
		priceMonthlyMinor: 19900,
		priceAnnualMinor: 199000,
		currency: "USD",
		userCap: null,
		supportSlaHours: 4,
		stripeSupported: true,
		chapaSupported: true,
		manualSupported: true,
		sortOrder: 3,
		entitlements: [
			{ featureKey: "core.access", enabled: true },
			{ featureKey: "platform.api-keys", enabled: true },
			{ featureKey: "platform.custom-roles", enabled: true },
			{ featureKey: "platform.custom-fields", enabled: true },
			{ featureKey: "platform.audit-export", enabled: true },
			{ featureKey: "platform.audit-retention-1year", enabled: true },
			{ featureKey: "platform.force-2fa", enabled: true },
			{ featureKey: "platform.ip-allowlist", enabled: true },
			{ featureKey: "reporting.custom-report-builder", enabled: true },
			{ featureKey: "reporting.schedule-delivery", enabled: true },
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
				description: plan.description,
				priceMonthlyMinor: plan.priceMonthlyMinor,
				priceAnnualMinor: plan.priceAnnualMinor,
				currency: plan.currency,
				userCap: plan.userCap,
				supportSlaHours: plan.supportSlaHours,
				stripeSupported: plan.stripeSupported,
				chapaSupported: plan.chapaSupported,
				manualSupported: plan.manualSupported,
				sortOrder: plan.sortOrder,
				active: true,
			},
			create: {
				slug: plan.slug,
				nameEn: plan.nameEn,
				nameAm: plan.nameAm,
				description: plan.description,
				priceMonthlyMinor: plan.priceMonthlyMinor,
				priceAnnualMinor: plan.priceAnnualMinor,
				currency: plan.currency,
				userCap: plan.userCap,
				supportSlaHours: plan.supportSlaHours,
				stripeSupported: plan.stripeSupported,
				chapaSupported: plan.chapaSupported,
				manualSupported: plan.manualSupported,
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

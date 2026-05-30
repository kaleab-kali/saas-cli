import "dotenv/config";
import {
	GENERIC_ONBOARDING_STEPS,
	GENERIC_ONBOARDING_TEMPLATE_KEY,
} from "../src/modules/onboarding/application/onboarding.service";
import { prisma } from "../src/shared/database/prisma-instance";

const seed = async () => {
	await prisma.onboardingTaskTemplate.upsert({
		where: { key: GENERIC_ONBOARDING_TEMPLATE_KEY },
		update: {
			name: "Generic SaaS setup",
			description: "Baseline tenant onboarding workflow for organization profile, branding, team, billing, and launch.",
			vertical: "generic",
			estimatedDays: 3,
			stepDefinitions: GENERIC_ONBOARDING_STEPS as never,
			createdByPack: "base",
			isActive: true,
		},
		create: {
			key: GENERIC_ONBOARDING_TEMPLATE_KEY,
			name: "Generic SaaS setup",
			description: "Baseline tenant onboarding workflow for organization profile, branding, team, billing, and launch.",
			vertical: "generic",
			estimatedDays: 3,
			stepDefinitions: GENERIC_ONBOARDING_STEPS as never,
			createdByPack: "base",
		},
	});

	console.log("Seeded generic onboarding task template.");
};

seed()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

const SAMPLE_ORG_SLUG = "acme";
const SAMPLE_PLAN_SLUG = "pro";
const SAMPLE_INVOICE_NUMBER = "INV-SEED-0001";

const addDays = (date: Date, days: number) => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

const seed = async () => {
	const organization = await prisma.organization.findUnique({ where: { slug: SAMPLE_ORG_SLUG } });
	if (!organization) {
		throw new Error(`Sample organization "${SAMPLE_ORG_SLUG}" was not found. Run prisma/seed.ts first.`);
	}

	const plan = await prisma.plan.findUnique({ where: { slug: SAMPLE_PLAN_SLUG } });
	if (!plan) {
		throw new Error(`Sample plan "${SAMPLE_PLAN_SLUG}" was not found. Run prisma/seed-plans.ts first.`);
	}

	const now = new Date();
	const currentPeriodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const currentPeriodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	const subtotalMinor = plan.priceMonthlyMinor;
	const taxMinor = Math.round(subtotalMinor * 0.15);

	const subscription = await prisma.subscription.upsert({
		where: { organizationId: organization.id },
		update: {
			planId: plan.id,
			status: "active",
			billingInterval: "monthly",
			currency: plan.currency,
			gateway: "manual",
			currentPeriodStart,
			currentPeriodEnd,
			canceledAt: null,
			cancelAtPeriodEnd: false,
			trialEndsAt: null,
			gracePeriodEndsAt: null,
			readOnlyModeEndsAt: null,
			lockedAt: null,
		},
		create: {
			organizationId: organization.id,
			planId: plan.id,
			status: "active",
			billingInterval: "monthly",
			currency: plan.currency,
			gateway: "manual",
			currentPeriodStart,
			currentPeriodEnd,
		},
	});

	await prisma.subscriptionInvoice.upsert({
		where: { number: SAMPLE_INVOICE_NUMBER },
		update: {
			subscriptionId: subscription.id,
			organizationId: organization.id,
			status: "sent",
			issueDate: now,
			dueDate: addDays(now, 7),
			periodStart: currentPeriodStart,
			periodEnd: currentPeriodEnd,
			currency: plan.currency,
			subtotalMinor,
			taxMinor,
			totalMinor: subtotalMinor + taxMinor,
			amountPaidMinor: 0,
			lineType: "subscription",
			description: `${plan.nameEn} monthly subscription`,
			sentAt: now,
		},
		create: {
			subscriptionId: subscription.id,
			organizationId: organization.id,
			number: SAMPLE_INVOICE_NUMBER,
			status: "sent",
			issueDate: now,
			dueDate: addDays(now, 7),
			periodStart: currentPeriodStart,
			periodEnd: currentPeriodEnd,
			currency: plan.currency,
			subtotalMinor,
			taxMinor,
			totalMinor: subtotalMinor + taxMinor,
			amountPaidMinor: 0,
			lineType: "subscription",
			description: `${plan.nameEn} monthly subscription`,
			sentAt: now,
		},
	});

	await prisma.usageSnapshot.create({
		data: {
			subscriptionId: subscription.id,
			organizationId: organization.id,
			userCount: 1,
			apiCallCount: 128,
			emailCount: 4,
			metricsJson: {
				requestsPerSecond: 0.12,
				storageBytes: 0,
			},
		},
	});

	console.log(`Sample subscription seeded for ${organization.name} on ${plan.nameEn}.`);
};

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

const FLAGS: Array<{ name: string; description: string }> = [
	{ name: "notifications_module", description: "Notifications, bulk email, templates" },
	{ name: "reports_module", description: "Reports and dashboards" },
	{ name: "stripe_payments", description: "Allow Stripe online payments for subscriptions" },
	{ name: "manual_payments", description: "Allow manual (cash, bank transfer) subscription payments" },
];

const seed = async () => {
	for (const f of FLAGS) {
		await prisma.featureFlag.upsert({
			where: { name: f.name },
			update: { description: f.description },
			create: { name: f.name, description: f.description, enabledGlobal: true },
		});
	}
	console.log(`Seeded ${FLAGS.length} feature flags.`);
};

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

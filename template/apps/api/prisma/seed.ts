import "dotenv/config";
import { randomUUID } from "node:crypto";
import { adminAuth } from "../src/modules/admin/auth/admin-auth.config";
import { auth } from "../src/modules/auth/auth.config";
import { prisma } from "../src/shared/database/prisma-instance";

const SAMPLE_ORG_NAME = "Acme Inc";
const SAMPLE_ORG_SLUG = "acme";

const seed = async () => {
	const adminEmail = process.env.SUPER_ADMIN_EMAIL;
	const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
	const adminName = process.env.SUPER_ADMIN_NAME || "Platform Admin";
	const ownerEmail = process.env.SAMPLE_OWNER_EMAIL || "owner@example.com";
	const ownerPassword = process.env.SAMPLE_OWNER_PASSWORD || "OwnerPass123!";
	const ownerName = process.env.SAMPLE_OWNER_NAME || "Acme Owner";

	if (!adminEmail || !adminPassword) {
		console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env");
		process.exit(1);
	}

	console.log("Seeding database...");

	console.log("Clearing existing data...");
	await prisma.subscriptionPayment.deleteMany();
	await prisma.subscriptionInvoice.deleteMany();
	await prisma.dunningEmail.deleteMany();
	await prisma.usageSnapshot.deleteMany();
	await prisma.subscription.deleteMany();
	await prisma.customRoleAssignment.deleteMany();
	await prisma.customRole.deleteMany();
	await prisma.apiKey.deleteMany();
	await prisma.auditLog.deleteMany();
	await prisma.notification.deleteMany();
	await prisma.orgEntitlementOverride.deleteMany();
	await prisma.cronJobRun.deleteMany();
	await prisma.adminSession.deleteMany();
	await prisma.adminAccount.deleteMany();
	await prisma.adminVerification.deleteMany();
	await prisma.adminUser.deleteMany();
	await prisma.platformAuditLog.deleteMany();
	await prisma.featureFlagOverride.deleteMany();
	await prisma.featureFlag.deleteMany();
	await prisma.platformSettings.deleteMany();
	await prisma.invitation.deleteMany();
	await prisma.member.deleteMany();
	await prisma.organization.deleteMany();
	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.user.deleteMany();
	console.log("Cleared existing data");

	console.log(`Creating super admin: ${adminEmail}`);
	const { user: superAdmin } = await adminAuth.api.signUpEmail({
		body: { name: adminName, email: adminEmail, password: adminPassword },
	});
	if (!superAdmin) {
		console.error("Failed to create super admin");
		process.exit(1);
	}
	console.log(`  super admin id: ${superAdmin.id}`);

	console.log(`Creating tenant owner: ${ownerEmail}`);
	const { user: tenantOwner } = await auth.api.signUpEmail({
		body: { name: ownerName, email: ownerEmail, password: ownerPassword },
	});
	if (!tenantOwner) {
		console.error("Failed to create tenant owner");
		process.exit(1);
	}
	console.log(`  tenant owner id: ${tenantOwner.id}`);

	console.log(`Creating sample organization: ${SAMPLE_ORG_NAME}`);
	const orgId = randomUUID();
	await prisma.organization.create({
		data: {
			id: orgId,
			name: SAMPLE_ORG_NAME,
			slug: SAMPLE_ORG_SLUG,
		},
	});
	console.log(`  org id: ${orgId}`);

	console.log("Adding tenant owner as Member with role=owner");
	await prisma.member.create({
		data: {
			id: randomUUID(),
			organizationId: orgId,
			userId: tenantOwner.id,
			role: "owner",
		},
	});
	console.log("  member created");

	console.log("Seeding feature flags");
	const flags = [
		{ name: "notifications", description: "Notifications, bulk email, templates" },
		{ name: "reports", description: "Reports and dashboards" },
		{ name: "stripe_payments", description: "Allow Stripe online payments" },
		{ name: "chapa_payments", description: "Allow Chapa online payments" },
		{ name: "manual_payments", description: "Allow manual (bank transfer) payments" },
		{ name: "custom_roles", description: "Per-org custom RBAC roles" },
		{ name: "api_keys", description: "API key management" },
		{ name: "audit_log_export", description: "Export audit log to CSV/JSON" },
	];
	for (const f of flags) {
		await prisma.featureFlag.upsert({
			where: { name: f.name },
			update: { description: f.description },
			create: { name: f.name, description: f.description, enabledGlobal: true },
		});
	}
	console.log(`  ${flags.length} flags seeded`);

	console.log("\n=== Seed Complete ===");
	console.log("");
	console.log("SUPER ADMIN (platform):");
	console.log(`  URL:      http://localhost:5173/admin-login`);
	console.log(`  Email:    ${adminEmail}`);
	console.log(`  Password: ${adminPassword}`);
	console.log("");
	console.log(`TENANT OWNER (sample org "${SAMPLE_ORG_NAME}"):`);
	console.log(`  URL:      http://localhost:5173/login`);
	console.log(`  Email:    ${ownerEmail}`);
	console.log(`  Password: ${ownerPassword}`);
	console.log("");
	console.log("====================\n");
};

seed()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

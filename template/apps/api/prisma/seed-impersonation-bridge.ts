import "dotenv/config";
import { auth } from "../src/modules/auth/auth.config";
import { prisma } from "../src/shared/database/prisma-instance";

/**
 * Seeds a tenant-side bridge user used by the super-admin impersonation flow.
 * Super admin first signs in as this bridge user (via our admin controller),
 * then the Better Auth admin plugin issues the impersonation session for target.
 *
 * Env:
 *   IMPERSONATE_BRIDGE_EMAIL (default: impersonation-bridge@propflow.internal)
 *   IMPERSONATE_BRIDGE_PASSWORD (required)
 */
const seed = async () => {
	const email = process.env.IMPERSONATE_BRIDGE_EMAIL ?? "impersonation-bridge@propflow.internal";
	const password = process.env.IMPERSONATE_BRIDGE_PASSWORD;
	if (!password) {
		console.error("IMPERSONATE_BRIDGE_PASSWORD env var required");
		process.exit(1);
	}

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		if (existing.role !== "admin") {
			await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
			console.log(`Bridge user ${email} role set to admin.`);
		} else {
			console.log(`Bridge user ${email} exists w/ role=admin. Nothing to do.`);
		}
		return;
	}

	const res = await auth.api.signUpEmail({
		body: { email, password, name: "Impersonation Bridge" },
	});
	const userId = (res as { user?: { id: string } }).user?.id;
	if (!userId) {
		console.error("Failed to create bridge user:", res);
		process.exit(1);
	}

	await prisma.user.update({
		where: { id: userId },
		data: { role: "admin", emailVerified: true },
	});
	console.log(`Bridge user created: ${email} (id=${userId}, role=admin)`);
};

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

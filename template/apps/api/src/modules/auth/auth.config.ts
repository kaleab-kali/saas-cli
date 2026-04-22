import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { PrismaClient } from "../../generated/prisma/client";
import { ac, accountant, admin, leasingAgent, maintenanceStaff, owner, propertyManager, viewer } from "./permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
	basePath: "/api/auth",
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: { enabled: true },

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // refresh every 24 hours
	},

	plugins: [
		organization({
			ac,
			roles: { owner, admin, propertyManager, leasingAgent, maintenanceStaff, accountant, viewer },
			allowUserToCreateOrganization: true,
			organizationLimit: 5,
			membershipLimit: 100,
			dynamicAccessControl: { enabled: true },
		}),
	],
});

export type Auth = typeof auth;

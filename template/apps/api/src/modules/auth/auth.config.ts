import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin, organization } from "better-auth/plugins";
import { prisma } from "#shared/database/prisma-instance";
import {
	ac,
	accountant,
	admin as adminOrgRole,
	generalManager,
	leasingAgent,
	maintenanceStaff,
	owner,
	propertyManager,
	salesAgent,
	salesSupervisor,
	viewer,
} from "./permissions";

export const auth = betterAuth({
	basePath: "/api/auth",
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"],

	database: prismaAdapter(prisma, { provider: "postgresql" }),

	emailAndPassword: { enabled: true },

	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
	},

	plugins: [
		organization({
			ac,
			roles: {
				owner,
				admin: adminOrgRole,
				generalManager,
				propertyManager,
				salesSupervisor,
				salesAgent,
				leasingAgent,
				maintenanceStaff,
				accountant,
				viewer,
			},
			allowUserToCreateOrganization: true,
			organizationLimit: 5,
			membershipLimit: 100,
			dynamicAccessControl: { enabled: true },
		}),
		// Admin plugin — enables impersonation + ban/unban via /api/auth/admin/*.
		// Requires a user with role in adminRoles to initiate impersonation.
		// Super admin impersonation flow: first signs in as bridge user (seeded w/ role=admin),
		// then calls impersonate-user. Wrapped by custom endpoint in admin-users.controller.ts.
		adminPlugin({
			adminRoles: ["admin"],
			defaultRole: "user",
			impersonationSessionDuration: 60 * 15, // 15 minutes
		}),
	],
});

export type Auth = typeof auth;

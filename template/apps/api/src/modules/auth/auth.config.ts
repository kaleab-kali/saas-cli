import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin, organization } from "better-auth/plugins";
import { prisma } from "#shared/database/prisma-instance";
import { ac, admin as adminOrgRole, member, owner, viewer } from "./permissions";

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
				member,
				viewer,
			},
			allowUserToCreateOrganization: true,
			organizationLimit: 5,
			membershipLimit: 100,
			dynamicAccessControl: { enabled: true },
		}),
		// Admin plugin — enables impersonation + ban/unban via /api/auth/admin/*.
		// Super admin impersonation flow: bridge user (role=admin) impersonates target tenant user.
		adminPlugin({
			adminRoles: ["admin"],
			defaultRole: "member",
			impersonationSessionDuration: 60 * 15, // 15 minutes
		}),
	],
});

export type Auth = typeof auth;

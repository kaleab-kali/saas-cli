import { Injectable } from "@nestjs/common";
import {
	accountant,
	admin,
	generalManager,
	leasingAgent,
	maintenanceStaff,
	owner,
	propertyManager,
	salesAgent,
	salesSupervisor,
	viewer,
} from "#modules/auth/permissions";

// Flatten Better Auth role → set of "resource:action" strings for escalation checks.
const SYSTEM_ROLES: Record<string, Record<string, readonly string[]>> = {
	owner: owner.statements as Record<string, readonly string[]>,
	admin: admin.statements as Record<string, readonly string[]>,
	generalManager: generalManager.statements as Record<string, readonly string[]>,
	propertyManager: propertyManager.statements as Record<string, readonly string[]>,
	leasingAgent: leasingAgent.statements as Record<string, readonly string[]>,
	salesSupervisor: salesSupervisor.statements as Record<string, readonly string[]>,
	salesAgent: salesAgent.statements as Record<string, readonly string[]>,
	maintenanceStaff: maintenanceStaff.statements as Record<string, readonly string[]>,
	accountant: accountant.statements as Record<string, readonly string[]>,
	viewer: viewer.statements as Record<string, readonly string[]>,
};

@Injectable()
export class RolePermissionResolverService {
	flattenSystemRole(roleSlug: string): Set<string> {
		const stmts = SYSTEM_ROLES[roleSlug];
		if (!stmts) return new Set();
		const out = new Set<string>();
		for (const [resource, actions] of Object.entries(stmts)) {
			for (const action of actions) out.add(`${resource}:${action}`);
		}
		return out;
	}

	availableSystemRoles(): string[] {
		return Object.keys(SYSTEM_ROLES);
	}

	getSystemRoleStatements(roleSlug: string) {
		return SYSTEM_ROLES[roleSlug] ?? null;
	}
}

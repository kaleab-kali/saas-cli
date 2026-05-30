import { ForbiddenException, Injectable } from "@nestjs/common";
import { statement } from "#modules/auth/permissions";
import type { PermissionsMap } from "../value-objects/scope.vo";

@Injectable()
export class PermissionValidatorService {
	/**
	 * Reject requests for unknown resources/actions (typos, injection).
	 */
	assertKnownPermissions(permissions: PermissionsMap): void {
		for (const [resource, actions] of Object.entries(permissions)) {
			const allowedActions = (statement as Record<string, readonly string[]>)[resource];
			if (!allowedActions) throw new ForbiddenException(`unknown resource: ${resource}`);
			for (const action of actions) {
				if (!allowedActions.includes(action)) {
					throw new ForbiddenException(`unknown action '${action}' for resource '${resource}'`);
				}
			}
		}
	}

	/**
	 * Escalation guard: creator cannot grant permissions they do not already hold.
	 * `creatorPermissions` is a flat set of "resource:action" strings derived from their role.
	 */
	assertNoEscalation(creatorPermissions: Set<string>, newPermissions: PermissionsMap): void {
		for (const [resource, actions] of Object.entries(newPermissions)) {
			for (const action of actions) {
				const key = `${resource}:${action}`;
				if (!creatorPermissions.has(key)) {
					throw new ForbiddenException(`cannot grant '${key}' because you do not hold this permission`);
				}
			}
		}
	}
}

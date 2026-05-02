import { Injectable } from "@nestjs/common";
import { statement } from "#modules/auth/permissions";
import { CustomRoleAssignmentRepository, CustomRoleRepository } from "../../domain/repositories/custom-role.repository";
import { RolePermissionResolverService } from "../../domain/services/role-permission-resolver.service";

@Injectable()
export class ListCustomRolesHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly assignments: CustomRoleAssignmentRepository,
	) {}
	async execute(organizationId: string, includeInactive = false) {
		const roles = await this.repo.list(organizationId, includeInactive);
		const out = [] as Array<ReturnType<(typeof roles)[number]["toPrimitives"]> & { memberCount: number }>;
		for (const r of roles) {
			const count = await this.assignments.countByRole(r.id);
			out.push({ ...r.toPrimitives(), memberCount: count });
		}
		return out;
	}
}

@Injectable()
export class GetCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly assignments: CustomRoleAssignmentRepository,
	) {}
	async execute(organizationId: string, id: string) {
		const role = await this.repo.findById(organizationId, id);
		if (!role) return null;
		const members = await this.assignments.listByRole(id);
		return { ...role.toPrimitives(), members };
	}
}

@Injectable()
export class GetPermissionMatrixHandler {
	execute() {
		// Returns resource→actions map for frontend matrix builder.
		return statement as Record<string, readonly string[]>;
	}
}

@Injectable()
export class GetSystemRolesHandler {
	constructor(private readonly resolver: RolePermissionResolverService) {}
	execute() {
		return this.resolver.availableSystemRoles().map((slug) => ({
			slug,
			statements: this.resolver.getSystemRoleStatements(slug),
		}));
	}
}

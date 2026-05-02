import type { CustomRole } from "../entities/custom-role.entity";

export abstract class CustomRoleRepository {
	abstract list(organizationId: string, includeInactive?: boolean): Promise<CustomRole[]>;
	abstract findById(organizationId: string, id: string): Promise<CustomRole | null>;
	abstract findBySlug(organizationId: string, slug: string): Promise<CustomRole | null>;
	abstract save(role: CustomRole): Promise<CustomRole>;
	abstract update(role: CustomRole): Promise<CustomRole>;
	abstract delete(organizationId: string, id: string): Promise<void>;
}

export abstract class CustomRoleAssignmentRepository {
	abstract assign(
		customRoleId: string,
		organizationId: string,
		userId: string,
		assignedByUserId: string,
	): Promise<void>;
	abstract unassign(customRoleId: string, userId: string): Promise<void>;
	abstract listByRole(customRoleId: string): Promise<{ userId: string; createdAt: Date }[]>;
	abstract listByUser(organizationId: string, userId: string): Promise<string[]>; // role IDs
	abstract countByRole(customRoleId: string): Promise<number>;
}

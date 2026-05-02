import type { CustomRole as PrismaCustomRole } from "../../../../generated/prisma/client";
import { CustomRole } from "../../domain/entities/custom-role.entity";
import type { PermissionsMap, RoleScope } from "../../domain/value-objects/scope.vo";

export class CustomRoleMapper {
	static toDomain(row: PrismaCustomRole): CustomRole {
		return CustomRole.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			slug: row.slug,
			nameEn: row.nameEn,
			nameAm: row.nameAm,
			description: row.description,
			inheritsFromSlug: row.inheritsFromSlug,
			permissionsJson: row.permissionsJson as unknown as PermissionsMap,
			scopeJson: row.scopeJson ? (row.scopeJson as unknown as RoleScope) : null,
			createdByUserId: row.createdByUserId,
			isSystem: row.isSystem,
			active: row.active,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(entity: CustomRole) {
		return entity.toPrimitives();
	}
}

import type { SecuritySettings as PrismaSecuritySettings } from "../../../../generated/prisma/client";
import { SecuritySettings } from "../../domain/entities/security-settings.entity";

export class SecuritySettingsMapper {
	static toDomain(row: PrismaSecuritySettings): SecuritySettings {
		return SecuritySettings.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			passwordMinLength: row.passwordMinLength,
			passwordRequireUpper: row.passwordRequireUpper,
			passwordRequireLower: row.passwordRequireLower,
			passwordRequireDigit: row.passwordRequireDigit,
			passwordRequireSymbol: row.passwordRequireSymbol,
			passwordMaxAgeDays: row.passwordMaxAgeDays,
			sessionTimeoutMinutes: row.sessionTimeoutMinutes,
			force2fa: row.force2fa,
			ipAllowlist: row.ipAllowlist,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(entity: SecuritySettings) {
		return entity.toPrimitives();
	}
}

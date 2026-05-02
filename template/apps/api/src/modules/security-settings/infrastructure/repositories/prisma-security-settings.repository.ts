import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { SecuritySettings } from "../../domain/entities/security-settings.entity";
import { SecuritySettingsRepository } from "../../domain/repositories/security-settings.repository";
import { SecuritySettingsMapper } from "../mappers/security-settings.mapper";

@Injectable()
export class PrismaSecuritySettingsRepository extends SecuritySettingsRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByOrg(organizationId: string): Promise<SecuritySettings | null> {
		const row = await this.prisma.securitySettings.findUnique({ where: { organizationId } });
		return row ? SecuritySettingsMapper.toDomain(row) : null;
	}

	async upsert(settings: SecuritySettings): Promise<SecuritySettings> {
		const p = settings.toPrimitives();
		const row = await this.prisma.securitySettings.upsert({
			where: { organizationId: p.organizationId },
			create: {
				organizationId: p.organizationId,
				passwordMinLength: p.passwordMinLength,
				passwordRequireUpper: p.passwordRequireUpper,
				passwordRequireLower: p.passwordRequireLower,
				passwordRequireDigit: p.passwordRequireDigit,
				passwordRequireSymbol: p.passwordRequireSymbol,
				passwordMaxAgeDays: p.passwordMaxAgeDays,
				sessionTimeoutMinutes: p.sessionTimeoutMinutes,
				force2fa: p.force2fa,
				ipAllowlist: p.ipAllowlist,
			},
			update: {
				passwordMinLength: p.passwordMinLength,
				passwordRequireUpper: p.passwordRequireUpper,
				passwordRequireLower: p.passwordRequireLower,
				passwordRequireDigit: p.passwordRequireDigit,
				passwordRequireSymbol: p.passwordRequireSymbol,
				passwordMaxAgeDays: p.passwordMaxAgeDays,
				sessionTimeoutMinutes: p.sessionTimeoutMinutes,
				force2fa: p.force2fa,
				ipAllowlist: p.ipAllowlist,
			},
		});
		return SecuritySettingsMapper.toDomain(row);
	}
}

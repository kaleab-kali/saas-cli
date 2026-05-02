import { Injectable } from "@nestjs/common";
import { SecuritySettings } from "../../domain/entities/security-settings.entity";
import { SecuritySettingsRepository } from "../../domain/repositories/security-settings.repository";
import type { UpdateSecuritySettingsDto } from "../dto/security-settings.dto";

const DEFAULTS = {
	passwordMinLength: 8,
	passwordRequireUpper: true,
	passwordRequireLower: true,
	passwordRequireDigit: true,
	passwordRequireSymbol: false,
	passwordMaxAgeDays: null as number | null,
	sessionTimeoutMinutes: 10080,
	force2fa: false,
	ipAllowlist: [] as string[],
} as const;

@Injectable()
export class GetSecuritySettingsHandler {
	constructor(private readonly repo: SecuritySettingsRepository) {}

	async execute(organizationId: string) {
		const s = await this.repo.findByOrg(organizationId);
		if (s) return s;
		return SecuritySettings.rehydrate({
			id: "",
			organizationId,
			...DEFAULTS,
			ipAllowlist: [...DEFAULTS.ipAllowlist],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}
}

@Injectable()
export class UpdateSecuritySettingsHandler {
	constructor(private readonly repo: SecuritySettingsRepository) {}

	async execute(organizationId: string, dto: UpdateSecuritySettingsDto) {
		const existing = await this.repo.findByOrg(organizationId);
		if (existing) {
			existing.update(dto);
			return this.repo.upsert(existing);
		}
		const created = SecuritySettings.create({
			id: "",
			organizationId,
			passwordMinLength: dto.passwordMinLength ?? DEFAULTS.passwordMinLength,
			passwordRequireUpper: dto.passwordRequireUpper ?? DEFAULTS.passwordRequireUpper,
			passwordRequireLower: dto.passwordRequireLower ?? DEFAULTS.passwordRequireLower,
			passwordRequireDigit: dto.passwordRequireDigit ?? DEFAULTS.passwordRequireDigit,
			passwordRequireSymbol: dto.passwordRequireSymbol ?? DEFAULTS.passwordRequireSymbol,
			passwordMaxAgeDays: dto.passwordMaxAgeDays ?? DEFAULTS.passwordMaxAgeDays,
			sessionTimeoutMinutes: dto.sessionTimeoutMinutes ?? DEFAULTS.sessionTimeoutMinutes,
			force2fa: dto.force2fa ?? DEFAULTS.force2fa,
			ipAllowlist: dto.ipAllowlist ?? [...DEFAULTS.ipAllowlist],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		return this.repo.upsert(created);
	}
}

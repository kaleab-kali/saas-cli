import type { SecuritySettings } from "../entities/security-settings.entity";

export abstract class SecuritySettingsRepository {
	abstract findByOrg(organizationId: string): Promise<SecuritySettings | null>;
	abstract upsert(settings: SecuritySettings): Promise<SecuritySettings>;
}

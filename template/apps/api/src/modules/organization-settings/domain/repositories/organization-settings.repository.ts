import type { OrganizationSettings } from "../entities/organization-settings.entity";

export abstract class OrganizationSettingsRepository {
	abstract findByOrg(organizationId: string): Promise<OrganizationSettings | null>;
	abstract upsert(settings: OrganizationSettings): Promise<OrganizationSettings>;
}

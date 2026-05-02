export const ORG_SETTINGS_EVENTS = {
	UPDATED: "org_settings.updated",
} as const;

export interface OrgSettingsUpdatedEvent {
	organizationId: string;
	changedFields: string[];
}

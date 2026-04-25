import type { NotificationPreference } from "../entities/notification-preference.entity";

export abstract class NotificationPreferenceRepository {
	abstract findByUserAndEvent(
		organizationId: string,
		userId: string,
		eventKey: string,
	): Promise<NotificationPreference | null>;
	abstract listForUser(organizationId: string, userId: string): Promise<NotificationPreference[]>;
	abstract save(pref: NotificationPreference): Promise<NotificationPreference>;
	abstract update(organizationId: string, id: string, pref: NotificationPreference): Promise<NotificationPreference>;
}

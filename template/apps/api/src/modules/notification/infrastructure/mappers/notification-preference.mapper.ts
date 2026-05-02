import { NotificationPreference, type PreferenceProps } from "../../domain/entities/notification-preference.entity";
import type { EmailFrequency } from "../../domain/value-objects/notification.vo";

export interface PreferenceRow {
	id: string;
	organizationId: string;
	userId: string;
	eventKey: string;
	inApp: boolean;
	email: string;
	sms: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const NotificationPreferenceMapper = {
	toDomain(row: PreferenceRow): NotificationPreference {
		const props: PreferenceProps = { ...row, email: row.email as EmailFrequency };
		return NotificationPreference.rehydrate(props);
	},

	toPersistence(pref: NotificationPreference) {
		const p = pref.toPrimitives();
		return {
			id: p.id,
			organizationId: p.organizationId,
			userId: p.userId,
			eventKey: p.eventKey,
			inApp: p.inApp,
			email: p.email,
			sms: p.sms,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		};
	},

	toDto(pref: NotificationPreference) {
		return pref.toPrimitives();
	},
};

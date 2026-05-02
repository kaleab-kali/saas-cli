export const NOTIFICATION_EVENTS = {
	NOTIFICATION_CREATED: "notification.created",
	NOTIFICATION_READ: "notification.read",
	NOTIFICATION_ARCHIVED: "notification.archived",
	PREFERENCE_UPDATED: "notification.preference_updated",
	BULK_SCHEDULED: "notification.bulk_scheduled",
	BULK_SENT: "notification.bulk_sent",
	BULK_FAILED: "notification.bulk_failed",
	TEMPLATE_UPSERTED: "notification.template_upserted",
} as const;

export type NotificationEventName = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

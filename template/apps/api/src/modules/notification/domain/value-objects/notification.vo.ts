export const NOTIFICATION_CATEGORIES = [
	"system",
	"billing",
	"reporting",
	"security",
	"user",
	"integration",
	"bulk",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "error", "critical"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const EMAIL_FREQUENCIES = ["instant", "daily", "weekly", "off"] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];

export const BULK_STATUSES = ["draft", "scheduled", "sending", "sent", "failed"] as const;
export type BulkStatus = (typeof BULK_STATUSES)[number];

export const AUDIENCE_TYPES = ["segment", "role", "custom", "all_users"] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];

export const EMAIL_STATUSES = ["queued", "sent", "delivered", "failed", "bounced"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

const BULK_TRANSITIONS: Record<BulkStatus, BulkStatus[]> = {
	draft: ["scheduled", "sending"],
	scheduled: ["sending", "draft"],
	sending: ["sent", "failed"],
	sent: [],
	failed: ["draft"],
};
export const canBulkTransition = (from: BulkStatus, to: BulkStatus): boolean =>
	(BULK_TRANSITIONS[from] ?? []).includes(to);

export const isCategory = (v: string): v is NotificationCategory =>
	(NOTIFICATION_CATEGORIES as readonly string[]).includes(v);
export const isSeverity = (v: string): v is NotificationSeverity =>
	(NOTIFICATION_SEVERITIES as readonly string[]).includes(v);
export const isFrequency = (v: string): v is EmailFrequency => (EMAIL_FREQUENCIES as readonly string[]).includes(v);

// Generic feature keys. Add your own per-app keys when you build domain modules.
// Plan→Entitlement table maps plan to {key, enabled, limit}.
// EntitlementService.can(org, key) uses these.

export const FEATURE_KEYS = [
	"core.access",
	"platform.branding",
	"platform.multi-currency",
	"platform.custom-fields",
	"platform.lookups",
	"platform.api-keys",
	"platform.api-requests-per-minute",
	"platform.members",
	"platform.file-upload",
	"platform.file-count",
	"platform.storage-bytes",
	"platform.webhooks",
	"platform.audit-retention-1year",
	"platform.audit-export",
	"platform.custom-roles",
	"platform.force-2fa",
	"platform.ip-allowlist",
	"notifications.bulk-email",
	"notifications.bulk-announcements",
	"reporting.custom-report-builder",
	"reporting.schedule-delivery",
	"reporting.export-xlsx",
	"reporting.export-pdf",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export const isFeatureKey = (v: string): v is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(v);

// Limit-carrying features — entitlement.limit is meaningful for these keys
export const LIMITED_FEATURES = {
	"notifications.bulk-email": "recipients per month",
	"notifications.bulk-announcements": "recipients per blast",
	"platform.custom-fields": "fields per entity",
	"platform.api-keys": "total active keys",
	"platform.api-requests-per-minute": "requests per minute",
	"platform.members": "active members",
	"platform.file-count": "stored files",
	"platform.storage-bytes": "stored bytes",
	"reporting.custom-report-builder": "saved reports",
	"reporting.schedule-delivery": "active schedules",
} as const;

export const PLAN_SLUGS = ["free", "pro", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];
export const isPlanSlug = (v: string): v is PlanSlug => (PLAN_SLUGS as readonly string[]).includes(v);

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = [
	"trialing",
	"active",
	"past_due",
	"grace",
	"read_only",
	"locked",
	"canceled",
	"suspended",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["draft", "sent", "pending_payment", "paid", "overdue", "void", "refunded"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
	"stripe_card",
	"stripe_ach",
	"chapa_telebirr",
	"chapa_cbe",
	"chapa_card",
	"manual_bank",
	"manual_other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = (v: string): v is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(v);

export const GATEWAYS = ["stripe", "chapa", "manual"] as const;
export type GatewayName = (typeof GATEWAYS)[number];

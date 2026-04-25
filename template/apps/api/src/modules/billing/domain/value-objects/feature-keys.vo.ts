// Every gated feature has a key. Plan→Entitlement table maps plan to {key, enabled, limit}.
// Keep exhaustive + sorted by module. EntitlementService.can(org, key) uses these.

export const FEATURE_KEYS = [
	// Property
	"property.multi-building",
	"property.unlimited-buildings",
	"property.media-unlimited",
	"property.bulk-create-units",
	"property.duplicate-building",
	"property.csv-import",
	"property.map-view",

	// Lease
	"lease.commercial",
	"lease.co-tenants",
	"lease.rent-escalation",
	"lease.cam-reconciliation",
	"lease.abstraction",
	"lease.early-termination",

	// Invoicing & rent
	"invoice.online-chapa",
	"invoice.late-fee-auto",
	"invoice.partial-payment",
	"invoice.overpayment-credit",
	"invoice.batch-payment",
	"invoice.delinquency-reminders",
	"invoice.payment-plans",

	// Maintenance
	"maintenance.vendor-directory",
	"maintenance.vendor-ratings",
	"maintenance.auto-assignment",
	"maintenance.time-tracking",
	"maintenance.material-costs",
	"maintenance.sla-policies",
	"maintenance.preventive-schedules",
	"maintenance.asset-registry",
	"maintenance.inspections",
	"maintenance.inspection-templates",

	// Sales
	"sales.module",
	"sales.agent-role",
	"sales.supervisor-role",
	"sales.agent-privacy",
	"sales.custom-stages",
	"sales.commission-auto",
	"sales.multi-developer",
	"sales.usd-pricing",

	// Estate / compound
	"estate.service-charges",
	"estate.per-block-config",
	"estate.hoa-minutes",

	// CRM
	"crm.activity-auto",
	"crm.segments-static",
	"crm.segments-dynamic",
	"crm.merge-duplicates",
	"crm.automation-rules",
	"crm.bulk-email",

	// Finance
	"finance.income-statement",
	"finance.cash-flow",
	"finance.owner-statements",
	"finance.chart-of-accounts",
	"finance.manual-journal",
	"finance.bank-reconciliation",
	"finance.vat-return",
	"finance.withholding-tax",

	// Reporting
	"reporting.financial-dashboard",
	"reporting.sales-dashboard",
	"reporting.maintenance-dashboard",
	"reporting.custom-report-builder",
	"reporting.schedule-delivery",
	"reporting.export-xlsx",
	"reporting.export-pdf",

	// Notifications
	"notifications.sms-afromessage",
	"notifications.telegram-bot",
	"notifications.bulk-announcements",

	// Platform
	"platform.branding",
	"platform.multi-currency",
	"platform.custom-fields",
	"platform.api-keys",
	"platform.webhooks",
	"platform.audit-retention-1year",
	"platform.audit-export",
	"platform.custom-roles",
	"platform.force-2fa",
	"platform.ip-allowlist",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export const isFeatureKey = (v: string): v is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(v);

// Limit-carrying features — entitlement.limit is meaningful for these keys
export const LIMITED_FEATURES = {
	"property.media-unlimited": "photos per entity",
	"crm.bulk-email": "recipients per month",
	"notifications.sms-afromessage": "SMS per month",
	"notifications.bulk-announcements": "recipients per blast",
	"platform.custom-fields": "fields per entity",
	"platform.api-keys": "total active keys",
	"reporting.custom-report-builder": "saved reports",
	"reporting.schedule-delivery": "active schedules",
} as const;

export const PLAN_SLUGS = ["starter", "growth", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];
export const isPlanSlug = (v: string): v is PlanSlug => (PLAN_SLUGS as readonly string[]).includes(v);

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ["active", "past_due", "canceled", "trialing", "suspended"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void", "refunded"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
	"chapa_online",
	"manual_cash",
	"manual_bank_transfer",
	"manual_telebirr",
	"manual_cheque",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = (v: string): v is PaymentMethod => (PAYMENT_METHODS as readonly string[]).includes(v);

// VAT constant — Ethiopian standard rate
export const VAT_RATE = 0.15 as const;

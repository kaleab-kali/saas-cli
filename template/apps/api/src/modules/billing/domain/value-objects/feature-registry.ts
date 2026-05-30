import { FEATURE_KEYS, type FeatureKey } from "./feature-keys.vo";

export type EnforcementMode = "allow" | "deny" | "limit";

export interface FeatureDefinition {
	key: FeatureKey;
	label: string;
	category: "core" | "platform" | "notifications" | "reporting";
	enforcement: EnforcementMode;
	usageMetric?:
		| "users"
		| "apiKeys"
		| "files"
		| "storageBytes"
		| "apiRequestsPerMinute"
		| "emails"
		| "savedReports"
		| "reportSchedules";
	description: string;
}

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
	"core.access": {
		key: "core.access",
		label: "Core access",
		category: "core",
		enforcement: "allow",
		description: "Base access to the SaaS application.",
	},
	"platform.branding": {
		key: "platform.branding",
		label: "Branding",
		category: "platform",
		enforcement: "allow",
		description: "Customize branding and organization appearance.",
	},
	"platform.multi-currency": {
		key: "platform.multi-currency",
		label: "Multi-currency",
		category: "platform",
		enforcement: "allow",
		description: "Enable multi-currency billing and reporting flows.",
	},
	"platform.custom-fields": {
		key: "platform.custom-fields",
		label: "Custom fields",
		category: "platform",
		enforcement: "limit",
		description: "Per-entity custom fields.",
	},
	"platform.lookups": {
		key: "platform.lookups",
		label: "Lookups",
		category: "platform",
		enforcement: "allow",
		description: "Per-tenant enum catalogs.",
	},
	"platform.api-keys": {
		key: "platform.api-keys",
		label: "API keys",
		category: "platform",
		enforcement: "limit",
		usageMetric: "apiKeys",
		description: "Programmatic API key access.",
	},
	"platform.api-requests-per-minute": {
		key: "platform.api-requests-per-minute",
		label: "API rate limit",
		category: "platform",
		enforcement: "limit",
		usageMetric: "apiRequestsPerMinute",
		description: "Default requests per minute for API keys without an explicit limit.",
	},
	"platform.members": {
		key: "platform.members",
		label: "Members",
		category: "platform",
		enforcement: "limit",
		usageMetric: "users",
		description: "Active members allowed in the tenant.",
	},
	"platform.file-upload": {
		key: "platform.file-upload",
		label: "File uploads",
		category: "platform",
		enforcement: "allow",
		description: "Upload and manage tenant files.",
	},
	"platform.file-count": {
		key: "platform.file-count",
		label: "File count",
		category: "platform",
		enforcement: "limit",
		usageMetric: "files",
		description: "Maximum stored file count.",
	},
	"platform.storage-bytes": {
		key: "platform.storage-bytes",
		label: "Storage",
		category: "platform",
		enforcement: "limit",
		usageMetric: "storageBytes",
		description: "Maximum stored bytes.",
	},
	"platform.webhooks": {
		key: "platform.webhooks",
		label: "Webhooks",
		category: "platform",
		enforcement: "allow",
		description: "Signed webhook examples and outbound integration scaffolds.",
	},
	"platform.audit-retention-1year": {
		key: "platform.audit-retention-1year",
		label: "Audit retention",
		category: "platform",
		enforcement: "allow",
		description: "One-year audit log retention entitlement.",
	},
	"platform.audit-export": {
		key: "platform.audit-export",
		label: "Audit export",
		category: "platform",
		enforcement: "allow",
		description: "CSV/JSON audit log exports.",
	},
	"platform.custom-roles": {
		key: "platform.custom-roles",
		label: "Custom roles",
		category: "platform",
		enforcement: "allow",
		description: "Tenant-defined custom roles and assignments.",
	},
	"platform.force-2fa": {
		key: "platform.force-2fa",
		label: "Force 2FA",
		category: "platform",
		enforcement: "allow",
		description: "Require two-factor authentication for members.",
	},
	"platform.ip-allowlist": {
		key: "platform.ip-allowlist",
		label: "IP allowlist",
		category: "platform",
		enforcement: "allow",
		description: "Restrict access by trusted IP ranges.",
	},
	"notifications.bulk-email": {
		key: "notifications.bulk-email",
		label: "Bulk email",
		category: "notifications",
		enforcement: "limit",
		usageMetric: "emails",
		description: "Bulk email recipients per month.",
	},
	"notifications.bulk-announcements": {
		key: "notifications.bulk-announcements",
		label: "Bulk announcements",
		category: "notifications",
		enforcement: "limit",
		description: "Bulk announcement recipients per blast.",
	},
	"reporting.custom-report-builder": {
		key: "reporting.custom-report-builder",
		label: "Custom reports",
		category: "reporting",
		enforcement: "limit",
		usageMetric: "savedReports",
		description: "Saved reports created with the report builder.",
	},
	"reporting.schedule-delivery": {
		key: "reporting.schedule-delivery",
		label: "Scheduled reports",
		category: "reporting",
		enforcement: "limit",
		usageMetric: "reportSchedules",
		description: "Scheduled report delivery.",
	},
	"reporting.export-xlsx": {
		key: "reporting.export-xlsx",
		label: "Excel export",
		category: "reporting",
		enforcement: "allow",
		description: "Export reports to XLSX.",
	},
	"reporting.export-pdf": {
		key: "reporting.export-pdf",
		label: "PDF export",
		category: "reporting",
		enforcement: "allow",
		description: "Export reports to PDF.",
	},
};

const missing = FEATURE_KEYS.filter((key) => !FEATURE_REGISTRY[key]);
if (missing.length > 0) {
	throw new Error(`Feature registry missing definitions: ${missing.join(", ")}`);
}

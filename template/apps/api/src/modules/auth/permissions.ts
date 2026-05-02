// ============================================================
// PERMISSION DEFINITIONS — generic SaaS skeleton
// ============================================================
// Client-safe. No DB imports. Used by both backend + frontend.
// 4 system roles: owner, admin, member, viewer.
// Add more permissions here when you build domain modules.
// ============================================================

import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
	organization: ["read", "update", "delete"],
	member: ["create", "read", "update", "delete"],
	"custom-role": ["create", "read", "update", "delete", "assign"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	"audit-log": ["read", "export"],
	billing: ["read", "manage-subscription", "view-invoices", "manage-payment-method"],
	notification: ["read", "manage", "broadcast"],
	report: ["read", "create", "update", "delete", "schedule", "export"],
	"custom-field": ["create", "read", "update", "delete"],
	lookup: ["create", "read", "update", "delete"],
	"saved-view": ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

// --- 4 SYSTEM ROLES (RBAC) ---

// Full org control. Billing, member management, settings, all data. Cannot be removed except by self.
export const owner = ac.newRole({
	organization: ["read", "update", "delete"],
	member: ["create", "read", "update", "delete"],
	"custom-role": ["create", "read", "update", "delete", "assign"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	"audit-log": ["read", "export"],
	billing: ["read", "manage-subscription", "view-invoices", "manage-payment-method"],
	notification: ["read", "manage", "broadcast"],
	report: ["read", "create", "update", "delete", "schedule", "export"],
	"custom-field": ["create", "read", "update", "delete"],
	lookup: ["create", "read", "update", "delete"],
	"saved-view": ["create", "read", "update", "delete"],
});

// Manage members + settings + all data. Cannot manage billing or delete org.
export const admin = ac.newRole({
	organization: ["read", "update"],
	member: ["create", "read", "update", "delete"],
	"custom-role": ["read", "assign"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	"audit-log": ["read", "export"],
	billing: ["read", "view-invoices"],
	notification: ["read", "manage", "broadcast"],
	report: ["read", "create", "update", "delete", "schedule", "export"],
	"custom-field": ["create", "read", "update", "delete"],
	lookup: ["create", "read", "update", "delete"],
	"saved-view": ["create", "read", "update", "delete"],
});

// Read+write data within scope. No settings, no member management, no billing.
export const member = ac.newRole({
	organization: ["read"],
	member: ["read"],
	"audit-log": ["read"],
	billing: ["read", "view-invoices"],
	notification: ["read"],
	report: ["read", "create", "update", "delete", "schedule", "export"],
	"custom-field": ["read"],
	lookup: ["read"],
	"saved-view": ["create", "read", "update", "delete"],
});

// Read-only across the org.
export const viewer = ac.newRole({
	organization: ["read"],
	member: ["read"],
	"audit-log": ["read"],
	billing: ["read", "view-invoices"],
	notification: ["read"],
	report: ["read"],
	"custom-field": ["read"],
	lookup: ["read"],
	"saved-view": ["read"],
});

// ============================================================
// PLATFORM SUPER ADMIN
// AdminUser table + separate Better Auth instance.
// AdminPermissionsGuard enforces platform roles: superAdmin, support, billingAdmin, readOnly.
// See: modules/admin/auth/ + modules/admin/guards/.
// ============================================================

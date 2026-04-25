// ============================================================
// PROPFLOW PERMISSION DEFINITIONS
// ============================================================
// This file is CLIENT-SAFE. No database imports. No server-only code.
// It defines all resources, actions, and roles for the RBAC system.
// Used by BOTH the NestJS backend and the React frontend.
// ============================================================

import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
	property: ["create", "read", "update", "delete", "archive"],
	unit: ["create", "read", "update", "delete", "assign"],
	lease: ["create", "read", "update", "terminate", "renew"],
	renter: ["create", "read", "update", "remove"],
	maintenance: ["create", "read", "update", "assign", "close", "delete"],
	"work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
	procurement: ["read", "create", "update", "approve", "reject", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	// contact:read = full PII (all contacts org-wide). read-stats = aggregates (Supervisor).
	// read-own = only contacts ownedByUserId=self (Agent).
	contact: ["create", "read", "read-stats", "read-own", "update", "delete", "merge", "export", "reassign"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	// deal:read-amounts = see deal amount + stage without contact PII (Supervisor)
	deal: ["create", "read", "read-amounts", "update", "close", "assign", "reassign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read", "export"],
	organization: ["read", "update", "delete"],
	member: ["create", "read", "update", "delete"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	billing: ["read", "manage-subscription", "view-invoices", "manage-payment-method"],
	"custom-role": ["create", "read", "update", "delete", "assign"],
} as const;

export const ac = createAccessControl(statement);

// --- ROLES ---

export const owner = ac.newRole({
	property: ["create", "read", "update", "delete", "archive"],
	unit: ["create", "read", "update", "delete", "assign"],
	lease: ["create", "read", "update", "terminate", "renew"],
	renter: ["create", "read", "update", "remove"],
	maintenance: ["create", "read", "update", "assign", "close", "delete"],
	"work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
	procurement: ["read", "create", "update", "approve", "reject", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	contact: ["create", "read", "read-stats", "read-own", "update", "delete", "merge", "export", "reassign"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read", "read-amounts", "update", "close", "assign", "reassign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read", "export"],
	organization: ["read", "update", "delete"],
	member: ["create", "read", "update", "delete"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	billing: ["read", "manage-subscription", "view-invoices", "manage-payment-method"],
	"custom-role": ["create", "read", "update", "delete", "assign"],
});

export const admin = ac.newRole({
	property: ["create", "read", "update", "delete", "archive"],
	unit: ["create", "read", "update", "delete", "assign"],
	lease: ["create", "read", "update", "terminate", "renew"],
	renter: ["create", "read", "update", "remove"],
	maintenance: ["create", "read", "update", "assign", "close", "delete"],
	"work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
	procurement: ["read", "create", "update", "approve", "reject", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	// Admin CANNOT read agent PII — only stats + reassign. Owner + GM (w/ toggle) see full.
	contact: ["create", "read-stats", "update", "delete", "merge", "reassign"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read-amounts", "update", "close", "assign", "reassign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read", "export"],
	organization: ["read", "update"],
	member: ["create", "read", "update", "delete"],
	"api-key": ["create", "read", "revoke"],
	"security-settings": ["read", "update"],
	billing: ["read", "view-invoices"],
	"custom-role": ["read"],
});

// General Manager — Owner's #2. Sees everything except billing + destructive ops.
// Agent contact PII gated by org setting `allowGmViewAgentContacts` (default: OFF).
export const generalManager = ac.newRole({
	property: ["create", "read", "update", "delete", "archive"],
	unit: ["create", "read", "update", "delete", "assign"],
	lease: ["create", "read", "update", "terminate", "renew"],
	renter: ["create", "read", "update", "remove"],
	maintenance: ["create", "read", "update", "assign", "close", "delete"],
	"work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
	procurement: ["read", "create", "update", "approve", "reject", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	// GM gets contact:read ONLY if org setting toggled ON — enforced at ContactOwnershipGuard level.
	contact: ["create", "read", "read-stats", "update", "delete", "merge", "export", "reassign"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read", "read-amounts", "update", "close", "assign", "reassign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read", "export"],
	organization: ["read", "update"],
	member: ["create", "read", "update", "delete"],
	billing: ["read", "view-invoices"],
	"custom-role": ["read"],
});

// Sales Supervisor — supervises agents, sees deal amounts + stats, NEVER contact PII.
export const salesSupervisor = ac.newRole({
	property: ["read"],
	unit: ["read"],
	listing: ["read", "update"],
	pipeline: ["read", "move-stage"],
	deal: ["read-amounts", "assign", "reassign"],
	contact: ["read-stats", "reassign"],
	report: ["view-dashboard"],
});

// Sales Agent — private contact ownership. Reads own contacts only. Cannot see peer agents' leads.
export const salesAgent = ac.newRole({
	property: ["read"],
	unit: ["read"],
	listing: ["create", "read", "update", "publish"],
	pipeline: ["read", "update", "move-stage"],
	deal: ["create", "read", "update", "close"],
	contact: ["create", "read-own", "update"],
	report: ["view-dashboard"],
});

export const propertyManager = ac.newRole({
	property: ["create", "read", "update"],
	unit: ["create", "read", "update", "assign"],
	lease: ["create", "read", "update", "renew"],
	renter: ["create", "read", "update"],
	maintenance: ["create", "read", "update", "assign", "close"],
	"work-order": ["create", "read", "update", "assign", "complete"],
	procurement: ["read", "create", "update"],
	vendor: ["read", "rate"],
	contact: ["create", "read", "update"],
	listing: ["create", "read", "update", "publish", "unpublish"],
	invoice: ["create", "read", "send"],
	report: ["view-dashboard"],
});

export const leasingAgent = ac.newRole({
	property: ["read"],
	unit: ["read"],
	lease: ["create", "read", "update"],
	renter: ["create", "read", "update"],
	contact: ["create", "read", "update"],
	pipeline: ["read", "update", "move-stage"],
	deal: ["create", "read", "update", "assign"],
	listing: ["create", "read", "update", "publish", "unpublish"],
	report: ["view-dashboard"],
});

export const maintenanceStaff = ac.newRole({
	property: ["read"],
	unit: ["read"],
	maintenance: ["read", "update"],
	"work-order": ["read", "update", "complete"],
	vendor: ["read"],
});

export const accountant = ac.newRole({
	property: ["read"],
	unit: ["read"],
	lease: ["read"],
	renter: ["read"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	procurement: ["approve", "receive"],
});

export const viewer = ac.newRole({
	property: ["read"],
	unit: ["read"],
	lease: ["read"],
	contact: ["read"],
	report: ["view-dashboard"],
});

// ============================================================
// PLATFORM SUPER ADMIN
// Admin uses separate AdminUser table + own auth system.
// See: modules/admin/auth/ for admin authentication.
// Completely isolated from tenant user auth (Better Auth).
// ============================================================

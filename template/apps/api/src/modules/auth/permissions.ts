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
	procurement: ["request", "approve", "reject", "create-po", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	contact: ["create", "read", "update", "delete", "merge", "export"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read", "update", "close", "assign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read"],
	organization: ["update", "delete"],
	member: ["create", "read", "update", "delete"],
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
	procurement: ["request", "approve", "reject", "create-po", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	contact: ["create", "read", "update", "delete", "merge", "export"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read", "update", "close", "assign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read"],
	organization: ["update", "delete"],
	member: ["create", "read", "update", "delete"],
});

export const admin = ac.newRole({
	property: ["create", "read", "update", "delete", "archive"],
	unit: ["create", "read", "update", "delete", "assign"],
	lease: ["create", "read", "update", "terminate", "renew"],
	renter: ["create", "read", "update", "remove"],
	maintenance: ["create", "read", "update", "assign", "close", "delete"],
	"work-order": ["create", "read", "update", "assign", "complete", "approve-cost"],
	procurement: ["request", "approve", "reject", "create-po", "receive"],
	vendor: ["create", "read", "update", "delete", "rate"],
	contact: ["create", "read", "update", "delete", "merge", "export"],
	pipeline: ["create", "read", "update", "delete", "move-stage"],
	deal: ["create", "read", "update", "close", "assign"],
	listing: ["create", "read", "update", "publish", "unpublish", "delete"],
	invoice: ["create", "read", "update", "send", "void", "record-payment"],
	report: ["view-dashboard", "view-financial", "export", "create-custom"],
	"audit-log": ["read"],
	organization: ["update"],
	member: ["create", "read", "update", "delete"],
});

export const propertyManager = ac.newRole({
	property: ["create", "read", "update"],
	unit: ["create", "read", "update", "assign"],
	lease: ["create", "read", "update", "renew"],
	renter: ["create", "read", "update"],
	maintenance: ["create", "read", "update", "assign", "close"],
	"work-order": ["create", "read", "update", "assign", "complete"],
	procurement: ["request"],
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

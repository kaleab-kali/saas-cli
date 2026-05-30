// Scope constraints applied on top of permissions.
// Resource-scoped: role only applies to selected app-defined resources.
// Approval limit: optional maximum value for approval actions.
// Time window: active only during those dow/hours.
// IP allowlist: role active only when request IP matches.

export interface RoleScope {
	resourceIds?: string[];
	approvalLimitMinor?: number;
	timeWindow?: {
		dow: number[]; // 0=Sun..6=Sat
		startHour: number; // 0-23
		endHour: number;
	};
	ipAllowlist?: string[];
}

export const isValidDow = (v: number) => Number.isInteger(v) && v >= 0 && v <= 6;
export const isValidHour = (v: number) => Number.isInteger(v) && v >= 0 && v <= 23;

export type PermissionsMap = Record<string, string[]>;

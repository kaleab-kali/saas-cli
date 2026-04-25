// Scope constraints applied on top of permissions.
// Building-scoped: role only applies to selected buildings.
// Approval limit: max ETB value for PR/PO approval actions.
// Time window: active only during those dow/hours.
// IP allowlist: role active only when request IP matches.

export interface RoleScope {
	buildings?: string[];
	approvalLimitEtb?: number;
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

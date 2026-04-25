/**
 * Default lookup values seeded per organization on first use.
 * Tenants have full CRUD over their own catalog.
 *
 * Skeleton ships with empty defaults. Add your domain enums here once you have them.
 *
 * Example:
 *   export const LOOKUP_DEFAULTS = {
 *     project_status: [
 *       { value: "active", label: "Active", color: "#10b981", sortOrder: 1 },
 *       { value: "archived", label: "Archived", color: "#6b7280", sortOrder: 2 },
 *     ] as DefaultLookup[],
 *   } as const;
 */
export interface DefaultLookup {
	value: string;
	label: string;
	color?: string;
	sortOrder?: number;
}

export const LOOKUP_DEFAULTS: Record<string, DefaultLookup[]> = {};

export type LookupKind = string;

export const KNOWN_LOOKUP_KINDS: LookupKind[] = Object.keys(LOOKUP_DEFAULTS);

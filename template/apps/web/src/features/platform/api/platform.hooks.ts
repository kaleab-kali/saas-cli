import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

// ────────────────── Organization Settings ──────────────────
export interface OrganizationSettings {
	id: string;
	organizationId: string;
	timezone: string;
	currency: string;
	areaUnit: string;
	dateFormat: string;
	fiscalYearStartMonth: number;
	invoiceNumberPrefix: string;
	invoiceNumberPadding: number;
	emailFooter: string | null;
	logoUrl: string | null;
	primaryColor: string | null;
	companyAddress: string | null;
	companyPhone: string | null;
	companyEmail: string | null;
	taxId: string | null;
	allowGmViewAgentContacts: boolean;
	allowGmExportAgentContacts: boolean;
	createdAt: string;
	updatedAt: string;
}

const orgSettingsKey = ["org-settings"] as const;

export const useOrganizationSettings = () =>
	useQuery({
		queryKey: orgSettingsKey,
		queryFn: () => api.get<{ data: OrganizationSettings }>("/organization-settings"),
		select: (r) => r.data,
	});

export const useUpdateOrganizationSettings = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: Partial<OrganizationSettings>) =>
			api.patch<{ data: OrganizationSettings }>("/organization-settings", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: orgSettingsKey }),
		meta: { successMessage: "Settings saved" },
	});
};

// ────────────────── Security Settings ──────────────────
export interface SecuritySettings {
	id: string;
	organizationId: string;
	passwordMinLength: number;
	passwordRequireUpper: boolean;
	passwordRequireLower: boolean;
	passwordRequireDigit: boolean;
	passwordRequireSymbol: boolean;
	passwordMaxAgeDays: number | null;
	sessionTimeoutMinutes: number;
	force2fa: boolean;
	ipAllowlist: string[];
}

const securityKey = ["security-settings"] as const;

export const useSecuritySettings = () =>
	useQuery({
		queryKey: securityKey,
		queryFn: () => api.get<{ data: SecuritySettings }>("/security-settings"),
		select: (r) => r.data,
	});

export const useUpdateSecuritySettings = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: Partial<SecuritySettings>) => api.patch<{ data: SecuritySettings }>("/security-settings", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: securityKey }),
		meta: { successMessage: "Security settings saved" },
	});
};

// ────────────────── API Keys ──────────────────
export interface ApiKey {
	id: string;
	organizationId: string;
	name: string;
	keyPrefix: string;
	scopes: string[];
	createdByUserId: string;
	expiresAt: string | null;
	revokedAt: string | null;
	lastUsedAt: string | null;
	usageCount: number;
	rateLimit: number | null;
	createdAt: string;
	updatedAt: string;
}

const keysKey = ["api-keys"] as const;

export const useApiKeys = (includeRevoked = false) =>
	useQuery({
		queryKey: [...keysKey, { includeRevoked }],
		queryFn: () =>
			api.get<{ data: ApiKey[] }>("/api-keys", { params: { includeRevoked: includeRevoked ? "true" : undefined } }),
		select: (r) => r.data,
	});

export const useCreateApiKey = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: { name: string; scopes: string[]; expiresAt?: string; rateLimit?: number }) =>
			api.post<{ data: { apiKey: ApiKey; plainKey: string } }>("/api-keys", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: keysKey }),
		meta: { successMessage: "API key created" },
	});
};

export const useRevokeApiKey = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: keysKey }),
		meta: { successMessage: "API key revoked" },
	});
};

// ────────────────── Audit Log ──────────────────
export interface AuditEntry {
	id: string;
	organizationId: string;
	userId: string | null;
	userEmail: string | null;
	action: string;
	resource: string;
	resourceId: string | null;
	correlationId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: unknown;
	status: string;
	errorMessage: string | null;
	createdAt: string;
}

export interface AuditLogParams {
	action?: string;
	resource?: string;
	userId?: string;
	status?: string;
	from?: string;
	to?: string;
	skip?: number;
	take?: number;
}

export const useAuditLogs = (params: AuditLogParams = {}) =>
	useQuery({
		queryKey: ["audit-logs", params],
		queryFn: () =>
			api.get<{ data: AuditEntry[]; meta: { total: number } }>("/audit-logs", {
				params: Object.fromEntries(
					Object.entries(params).map(([k, v]) => [k, v === undefined ? undefined : String(v)]),
				) as Record<string, string | undefined>,
			}),
	});

export const downloadAuditLog = async (format: "csv" | "json", params: AuditLogParams = {}) => {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
	const res = await fetch(`/api/v1/audit-logs/export/${format}?${q.toString()}`, { credentials: "include" });
	if (!res.ok) throw new Error(`Export failed: ${res.status}`);
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	const cd = res.headers.get("content-disposition") ?? "";
	const match = /filename="([^"]+)"/.exec(cd);
	a.download = match?.[1] ?? `audit-log.${format}`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
};

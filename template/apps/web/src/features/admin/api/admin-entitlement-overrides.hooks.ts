import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface EntitlementOverride {
	readonly id: string;
	readonly organizationId: string;
	readonly featureKey: string;
	readonly enabled: boolean;
	readonly limit: number | null;
	readonly expiresAt: string | null;
	readonly reason: string | null;
	readonly grantedByUserId: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
}

const k = { all: ["admin-entitlement-overrides"] as const, org: (id: string) => [...k.all, "org", id] as const };

export const useOrgEntitlementOverrides = (organizationId: string) =>
	useQuery({
		queryKey: k.org(organizationId),
		queryFn: () =>
			api.get<{ data: EntitlementOverride[] }>("/admin/entitlement-overrides", {
				params: { organizationId },
			}),
		select: (r) => r.data,
		enabled: !!organizationId,
	});

export const useUpsertOverride = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			organizationId: string;
			featureKey: string;
			enabled: boolean;
			limit?: number | null;
			expiresAt?: string | null;
			reason?: string;
		}) => api.post<{ data: EntitlementOverride }>("/admin/entitlement-overrides", body),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.org(v.organizationId) }),
	});
};

export const useDeleteOverride = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/admin/entitlement-overrides/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface AdminPlan {
	readonly id: string;
	readonly slug: string;
	readonly nameEn: string;
	readonly nameAm: string;
	readonly priceMonthlyEtb: number;
	readonly priceAnnualEtb: number;
	readonly priceCampaignDailyEtb: number | null;
	readonly buildingCap: number | null;
	readonly unitCap: number | null;
	readonly userCap: number | null;
	readonly supportSlaHours: number;
	readonly active: boolean;
	readonly sortOrder: number;
	readonly entitlements: Array<{ id: string; featureKey: string; enabled: boolean; limit: number | null }>;
	readonly createdAt: string;
	readonly updatedAt: string;
}

const planKeys = {
	all: ["admin-plans"] as const,
	list: (includeInactive: boolean) => [...planKeys.all, "list", includeInactive] as const,
	detail: (id: string) => [...planKeys.all, "detail", id] as const,
	featureKeys: () => [...planKeys.all, "feature-keys"] as const,
};

export const useAdminPlans = (includeInactive = false) =>
	useQuery({
		queryKey: planKeys.list(includeInactive),
		queryFn: () =>
			api.get<{ data: AdminPlan[] }>("/admin/plans", { params: { includeInactive: String(includeInactive) } }),
		select: (r) => r.data,
	});

export const useAdminPlan = (id: string) =>
	useQuery({
		queryKey: planKeys.detail(id),
		queryFn: () => api.get<{ data: AdminPlan }>(`/admin/plans/${id}`),
		select: (r) => r.data,
		enabled: !!id,
	});

export const useAdminFeatureKeys = () =>
	useQuery({
		queryKey: planKeys.featureKeys(),
		queryFn: () => api.get<{ data: string[] }>("/admin/plans/feature-keys"),
		select: (r) => r.data,
	});

export const useCreatePlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (
			body: Omit<AdminPlan, "id" | "entitlements" | "createdAt" | "updatedAt" | "active"> & { active?: boolean },
		) => api.post<{ data: AdminPlan }>("/admin/plans", body),
		onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
	});
};

export const useUpdatePlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<AdminPlan, "id" | "entitlements">>) =>
			api.put<{ data: AdminPlan }>(`/admin/plans/${id}`, body),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: planKeys.all });
			qc.invalidateQueries({ queryKey: planKeys.detail(vars.id) });
		},
	});
};

export const useArchivePlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.put(`/admin/plans/${id}/archive`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: planKeys.all }),
	});
};

export const useUpsertEntitlement = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			planId,
			featureKey,
			enabled,
			limit,
		}: {
			planId: string;
			featureKey: string;
			enabled: boolean;
			limit: number | null;
		}) => api.put(`/admin/plans/${planId}/entitlements`, { featureKey, enabled, limit }),
		onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: planKeys.detail(vars.planId) }),
	});
};

export const useBulkUpsertEntitlements = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			planId,
			entitlements,
		}: {
			planId: string;
			entitlements: Array<{ featureKey: string; enabled: boolean; limit: number | null }>;
		}) => api.post(`/admin/plans/${planId}/entitlements/bulk`, { entitlements }),
		onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: planKeys.detail(vars.planId) }),
	});
};

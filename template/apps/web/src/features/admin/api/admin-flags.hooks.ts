import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface FeatureFlagRow {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly enabledGlobal: boolean;
	readonly overrides: Array<{
		id: string;
		organizationId: string;
		enabled: boolean;
	}>;
}

const k = { all: ["admin-feature-flags"] as const };

export const useFeatureFlags = () =>
	useQuery({
		queryKey: k.all,
		queryFn: () => api.get<{ data: FeatureFlagRow[] }>("/admin/settings/feature-flags"),
		select: (r) => r.data,
	});

export const useToggleFlagGlobal = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
			api.put(`/admin/settings/feature-flags/${encodeURIComponent(name)}/global`, { enabled }),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

export const useToggleFlagForOrg = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ name, orgId, enabled }: { name: string; orgId: string; enabled: boolean }) =>
			api.put(`/admin/settings/feature-flags/${encodeURIComponent(name)}/org/${orgId}`, { enabled }),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

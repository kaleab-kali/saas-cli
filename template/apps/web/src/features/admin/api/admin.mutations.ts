import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";
import { adminKeys } from "./admin.queries";

export const useSuspendOrg = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ orgId, reason }: { orgId: string; reason?: string }) =>
			api.post(`/admin/organizations/${orgId}/suspend`, { reason }),
		onSuccess: (_data, v) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.orgs() });
			queryClient.invalidateQueries({ queryKey: adminKeys.orgDetail(v.orgId) });
		},
	});
};

export const useUnsuspendOrg = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ orgId }: { orgId: string }) => api.post(`/admin/organizations/${orgId}/unsuspend`),
		onSuccess: (_data, v) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.orgs() });
			queryClient.invalidateQueries({ queryKey: adminKeys.orgDetail(v.orgId) });
		},
	});
};

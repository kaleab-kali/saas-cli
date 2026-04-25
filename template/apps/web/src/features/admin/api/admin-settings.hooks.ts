import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface PlatformSettingRow {
	readonly id: string;
	readonly key: string;
	readonly value: string;
	readonly updatedAt: string;
}

const k = { all: ["admin-platform-settings"] as const };

export const useAdminPlatformSettings = () =>
	useQuery({
		queryKey: k.all,
		queryFn: () => api.get<{ data: PlatformSettingRow[] }>("/admin/settings"),
		select: (r) => r.data,
	});

export const useUpdatePlatformSetting = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ key, value }: { key: string; value: string }) =>
			api.put(`/admin/settings/${encodeURIComponent(key)}`, { value }),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

export const useBulkUpdatePlatformSettings = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (entries: Array<{ key: string; value: string }>) => api.put("/admin/settings", { entries }),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

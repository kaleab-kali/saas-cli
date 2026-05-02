import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type ViewMode = "table" | "cards" | "kanban" | "map";

export interface SavedView {
	id: string;
	organizationId: string;
	entity: string;
	name: string;
	filtersJson: Record<string, unknown>;
	sortJson: Record<string, unknown> | null;
	columnsJson: Record<string, unknown> | null;
	viewMode: ViewMode;
	isShared: boolean;
	createdById: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateSavedViewInput {
	entity: string;
	name: string;
	filtersJson: Record<string, unknown>;
	sortJson?: Record<string, unknown>;
	columnsJson?: Record<string, unknown>;
	viewMode?: ViewMode;
	isShared?: boolean;
}

const keys = {
	list: (entity: string) => ["saved-views", entity] as const,
};

export const useSavedViews = (entity: string) =>
	useQuery({
		queryKey: keys.list(entity),
		queryFn: async () => {
			try {
				return await api.get<{ data: SavedView[] }>("/saved-views", { params: { entity } });
			} catch {
				// Feature may not be available yet — return empty gracefully.
				return { data: [] as SavedView[] };
			}
		},
		select: (r) => r.data,
		enabled: !!entity,
		retry: false,
	});

export const useCreateSavedView = (entity: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateSavedViewInput) => api.post<{ data: SavedView }>("/saved-views", data),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(entity) }),
		meta: { successMessage: "View saved", errorMessage: "Failed to save view" },
	});
};

export const useDeleteSavedView = (entity: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/saved-views/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(entity) }),
		meta: { successMessage: "View deleted", errorMessage: "Failed to delete view" },
	});
};

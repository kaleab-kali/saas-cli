import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type LookupKind = string;

export interface LookupItem {
	id: string;
	organizationId: string;
	kind: string;
	value: string;
	label: string;
	description: string | null;
	color: string | null;
	sortOrder: number;
	isBuiltIn: boolean;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateLookupInput {
	value?: string;
	label: string;
	description?: string;
	color?: string;
	sortOrder?: number;
}

export interface UpdateLookupInput {
	label?: string;
	description?: string | null;
	color?: string | null;
	sortOrder?: number;
	archived?: boolean;
}

const lookupKeys = {
	all: ["lookups"] as const,
	kind: (kind: LookupKind) => [...lookupKeys.all, kind] as const,
};

export const useLookups = (kind: LookupKind, includeArchived = false) =>
	useQuery({
		queryKey: [...lookupKeys.kind(kind), { includeArchived }] as const,
		queryFn: () =>
			api.get<{ data: LookupItem[] }>(`/lookups/${kind}`, {
				params: includeArchived ? { includeArchived: "true" } : undefined,
			}),
		select: (res) => res.data,
	});

export const useCreateLookup = (kind: LookupKind) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateLookupInput) => api.post<{ data: LookupItem }>(`/lookups/${kind}`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: lookupKeys.kind(kind) }),
		meta: { successMessage: "Value added", errorMessage: "Failed to add value" },
	});
};

export const useUpdateLookup = (kind: LookupKind) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & UpdateLookupInput) =>
			api.patch<{ data: LookupItem }>(`/lookups/items/${id}`, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: lookupKeys.kind(kind) }),
		meta: { successMessage: "Value updated", errorMessage: "Failed to update value" },
	});
};

export const useDeleteLookup = (kind: LookupKind) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/lookups/items/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: lookupKeys.kind(kind) }),
		meta: { successMessage: "Value deleted", errorMessage: "Failed to delete value" },
	});
};

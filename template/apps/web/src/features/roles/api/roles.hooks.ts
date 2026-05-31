import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface CustomRole {
	id: string;
	organizationId: string;
	slug: string;
	nameEn: string;
	nameAm: string | null;
	description: string | null;
	inheritsFromSlug: string | null;
	permissionsJson: Record<string, string[]>;
	scopeJson: Record<string, unknown> | null;
	createdByUserId: string;
	isSystem: boolean;
	active: boolean;
	createdAt: string;
	updatedAt: string;
	memberCount: number;
}

export interface SystemRoleInfo {
	slug: string;
	statements: Record<string, readonly string[]>;
}

export const roleKeys = {
	all: ["roles"] as const,
	list: () => [...roleKeys.all, "list"] as const,
	detail: (id: string) => [...roleKeys.all, "detail", id] as const,
	matrix: () => [...roleKeys.all, "matrix"] as const,
	system: () => [...roleKeys.all, "system"] as const,
};

export const useRoleMatrix = () =>
	useQuery({
		queryKey: roleKeys.matrix(),
		queryFn: () => api.get<{ data: Record<string, string[]> }>("/roles/matrix"),
		select: (r) => r.data,
		staleTime: Number.POSITIVE_INFINITY,
	});

export const useSystemRoles = () =>
	useQuery({
		queryKey: roleKeys.system(),
		queryFn: () => api.get<{ data: SystemRoleInfo[] }>("/roles/system"),
		select: (r) => r.data,
		staleTime: Number.POSITIVE_INFINITY,
	});

export const useCustomRoles = () =>
	useQuery({
		queryKey: roleKeys.list(),
		queryFn: () => api.get<{ data: CustomRole[] }>("/roles"),
		select: (r) => r.data,
	});

export const useCustomRole = (id: string | null) =>
	useQuery({
		queryKey: roleKeys.detail(id ?? ""),
		queryFn: () => api.get<{ data: CustomRole }>(`/roles/${id}`),
		select: (r) => r.data,
		enabled: !!id,
	});

export const useCreateRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			slug: string;
			nameEn: string;
			nameAm?: string;
			description?: string;
			inheritsFromSlug?: string;
			permissionsJson: Record<string, string[]>;
			scopeJson?: Record<string, unknown>;
		}) => api.post<{ data: CustomRole }>("/roles", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
		meta: { successMessage: "Role created" },
	});
};

export const useUpdateRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...dto }: { id: string } & Partial<CustomRole>) => api.patch(`/roles/${id}`, dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
		meta: { successMessage: "Role updated" },
	});
};

export const useDeleteRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/roles/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
		meta: { successMessage: "Role deleted" },
	});
};

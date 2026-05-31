import { useQuery } from "@tanstack/react-query";
import type {
	AuditLogEntry,
	OrgDetail,
	OrgListItem,
	PaginatedResponse,
	PlatformStats,
	PlatformUser,
} from "#features/admin/types/admin.types";
import { api } from "#shared/lib/api-client";

export const adminKeys = {
	all: ["admin"] as const,
	stats: () => [...adminKeys.all, "stats"] as const,
	orgs: () => [...adminKeys.all, "orgs"] as const,
	orgList: (params: Record<string, unknown>) => [...adminKeys.orgs(), "list", params] as const,
	orgDetail: (id: string) => [...adminKeys.orgs(), "detail", id] as const,
	users: () => [...adminKeys.all, "users"] as const,
	userList: (params: Record<string, unknown>) => [...adminKeys.users(), "list", params] as const,
	auditLogs: (params: Record<string, unknown>) => [...adminKeys.all, "audit-logs", params] as const,
};

export const useAdminStats = () =>
	useQuery({
		queryKey: adminKeys.stats(),
		queryFn: () => api.get<{ data: PlatformStats }>("/admin/stats"),
		select: (res) => res.data,
	});

export const useAdminOrgList = (params: { page?: number; limit?: number; search?: string } = {}) =>
	useQuery({
		queryKey: adminKeys.orgList(params),
		queryFn: () => api.get<PaginatedResponse<OrgListItem>>("/admin/organizations", { params }),
	});

export const useAdminOrgDetail = (orgId: string) =>
	useQuery({
		queryKey: adminKeys.orgDetail(orgId),
		queryFn: () => api.get<{ data: OrgDetail }>(`/admin/organizations/${orgId}`),
		select: (res) => res.data,
		enabled: !!orgId,
	});

export const useAdminUserList = (
	params: { page?: number; limit?: number; search?: string; sort?: string; verified?: string } = {},
) =>
	useQuery({
		queryKey: adminKeys.userList(params),
		queryFn: () => api.get<PaginatedResponse<PlatformUser>>("/admin/users", { params }),
	});

export const useAdminAuditLogs = (
	params: {
		page?: number;
		limit?: number;
		search?: string;
		sort?: string;
		action?: string;
		targetType?: string;
		performedBy?: string;
		targetId?: string;
		from?: string;
		to?: string;
	} = {},
) =>
	useQuery({
		queryKey: adminKeys.auditLogs(params),
		queryFn: () => api.get<PaginatedResponse<AuditLogEntry>>("/admin/audit-logs", { params }),
	});

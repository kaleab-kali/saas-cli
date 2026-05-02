import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface Notification {
	id: string;
	category: string;
	severity: string;
	title: string;
	body?: string | null;
	linkUrl?: string | null;
	sourceEvent?: string | null;
	sourceRef?: string | null;
	read: boolean;
	readAt?: string | null;
	archivedAt?: string | null;
	createdAt: string;
}

export interface NotificationMeta {
	total: number;
	unread: number;
	page: number;
	limit: number;
	totalPages: number;
}

export const notifKeys = {
	all: ["notifications"] as const,
	list: (p: Record<string, unknown>) => ["notifications", "list", p] as const,
	prefs: ["notifications", "prefs"] as const,
	templates: ["notifications", "templates"] as const,
	bulk: ["notifications", "bulk"] as const,
};

export const useNotifications = (params: { category?: string; read?: boolean; page?: number; limit?: number } = {}) =>
	useQuery({
		queryKey: notifKeys.list(params),
		queryFn: () =>
			api.get<{ data: Notification[]; meta: NotificationMeta }>("/notifications", {
				params: params as Record<string, string | number | boolean | undefined>,
			}),
	});

export const useMarkRead = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
	});
};

export const useMarkAllRead = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post("/notifications/mark-all-read", {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
		meta: { successMessage: "Marked all as read" },
	});
};

export const useArchiveNotification = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/notifications/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.all }),
	});
};

export interface NotificationPreference {
	id: string;
	eventKey: string;
	inApp: boolean;
	email: "instant" | "daily" | "weekly" | "off";
	sms: boolean;
}

export const usePreferences = () =>
	useQuery({
		queryKey: notifKeys.prefs,
		queryFn: () => api.get<{ data: NotificationPreference[] }>("/notifications/preferences/me"),
		select: (r) => r.data,
	});

export const useUpsertPreference = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: { eventKey: string; inApp?: boolean; email?: string; sms?: boolean }) =>
			api.patch("/notifications/preferences/me", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.prefs }),
		meta: { successMessage: "Preference saved" },
	});
};

export interface NotificationTemplate {
	id: string;
	eventKey: string;
	subject: string;
	bodyHtml: string;
	bodyText?: string | null;
	active: boolean;
}

export const useTemplates = () =>
	useQuery({
		queryKey: notifKeys.templates,
		queryFn: () => api.get<{ data: NotificationTemplate[] }>("/notifications/templates"),
		select: (r) => r.data,
	});

export const useUpsertTemplate = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: { eventKey: string; subject: string; bodyHtml: string; bodyText?: string; active?: boolean }) =>
			api.post("/notifications/templates", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.templates }),
		meta: { successMessage: "Template saved" },
	});
};

export const useDeleteTemplate = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/notifications/templates/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.templates }),
		meta: { successMessage: "Template deleted" },
	});
};

export interface BulkCommunication {
	id: string;
	name: string;
	subject: string;
	bodyHtml: string;
	status: string;
	audienceType: string;
	audienceRef?: string | null;
	recipientCount: number;
	scheduledAt?: string | null;
	sentAt?: string | null;
	stats?: { delivered?: number; failed?: number; error?: string } | null;
	createdAt: string;
}

export const useBulkList = (status?: string) =>
	useQuery({
		queryKey: [...notifKeys.bulk, status],
		queryFn: () => api.get<{ data: BulkCommunication[] }>("/notifications/bulk", { params: status ? { status } : {} }),
		select: (r) => r.data,
	});

export const useCreateBulk = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			name: string;
			subject: string;
			bodyHtml: string;
			audienceType: string;
			audienceRef?: string;
		}) => api.post<{ data: BulkCommunication }>("/notifications/bulk", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.bulk }),
		meta: { successMessage: "Draft created" },
	});
};

export const useScheduleBulk = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (p: { id: string; scheduledAt: string }) =>
			api.post(`/notifications/bulk/${p.id}/schedule`, { scheduledAt: p.scheduledAt }),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.bulk }),
		meta: { successMessage: "Scheduled" },
	});
};

export const useSendBulk = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post(`/notifications/bulk/${id}/send`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.bulk }),
		meta: { successMessage: "Sent" },
	});
};

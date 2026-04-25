import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface SystemEmailTemplate {
	readonly id: string;
	readonly key: string;
	readonly subject: string;
	readonly bodyHtml: string;
	readonly subjectAm: string | null;
	readonly bodyHtmlAm: string | null;
	readonly variables: string | null;
	readonly updatedAt: string;
}

const k = { all: ["admin-system-templates"] as const };

export const useSystemTemplates = () =>
	useQuery({
		queryKey: k.all,
		queryFn: () => api.get<{ data: SystemEmailTemplate[] }>("/admin/system-templates"),
		select: (r) => r.data,
	});

export const useSystemTemplate = (key: string) =>
	useQuery({
		queryKey: [...k.all, key],
		queryFn: () => api.get<{ data: SystemEmailTemplate | null }>(`/admin/system-templates/${key}`),
		select: (r) => r.data,
		enabled: !!key,
	});

export const useUpdateSystemTemplate = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			key,
			...body
		}: {
			key: string;
			subject?: string;
			bodyHtml?: string;
			subjectAm?: string;
			bodyHtmlAm?: string;
			variables?: string;
		}) => api.put(`/admin/system-templates/${key}`, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

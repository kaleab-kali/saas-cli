import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface FileAsset {
	id: string;
	organizationId: string;
	folder: string;
	key: string;
	url: string;
	filename: string;
	mimeType: string;
	size: number;
	storageDriver: "local" | "object";
	createdAt: string;
}

const keys = {
	all: ["files"] as const,
	folder: (folder?: string) => ["files", folder ?? ""] as const,
};

export const useFiles = (folder?: string) =>
	useQuery({
		queryKey: keys.folder(folder),
		queryFn: () =>
			api.get<{ data: FileAsset[] }>("/uploads", {
				params: folder ? { folder } : undefined,
			}),
		select: (r) => r.data,
	});

export const useUploadFile = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ file, folder }: { file: File; folder: string }) => {
			const form = new FormData();
			form.append("file", file);
			return api.upload<{ data: FileAsset }>("/uploads", form, { params: { folder } });
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
};

export const useDeleteFile = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/uploads/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
};

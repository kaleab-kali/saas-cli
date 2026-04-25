import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface JobRun {
	readonly id: string;
	readonly jobName: string;
	readonly status: "running" | "success" | "failed";
	readonly startedAt: string;
	readonly finishedAt: string | null;
	readonly durationMs: number | null;
	readonly summary: string | null;
	readonly errorMessage: string | null;
	readonly triggeredByUserId: string | null;
}

export interface JobInfo {
	readonly name: string;
	readonly lastRun: JobRun | null;
}

const k = { all: ["admin-jobs"] as const };

export const useJobs = () =>
	useQuery({
		queryKey: k.all,
		queryFn: () => api.get<{ data: JobInfo[] }>("/admin/jobs"),
		select: (r) => r.data,
		refetchInterval: 5000,
	});

export const useJobRuns = (jobName?: string) =>
	useQuery({
		queryKey: [...k.all, "runs", jobName ?? ""],
		queryFn: () =>
			api.get<{ data: JobRun[] }>("/admin/jobs/runs", {
				params: jobName ? { jobName } : undefined,
			}),
		select: (r) => r.data,
	});

export const useTriggerJob = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => api.post(`/admin/jobs/${encodeURIComponent(name)}/trigger`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

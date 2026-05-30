import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface ServerOverview {
	app: { name: string; nodeEnv: string; uptimeSeconds: number; pid: number; nodeVersion: string };
	host: {
		platform: string;
		arch: string;
		hostname: string;
		cpus: number;
		load1m: number;
		load5m: number;
		load15m: number;
		totalMemoryBytes: number;
		freeMemoryBytes: number;
	};
	process: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number; externalBytes: number };
	http: {
		uptimeSeconds: number;
		totalRequests: number;
		totalErrors: number;
		requestsPerSecond1m: number;
		errorRate1m: number;
		p50LatencyMs: number;
		p95LatencyMs: number;
		activeRequests: number;
	};
	dependencies: {
		database: { ok: boolean; latencyMs: number; error?: string };
		redisConfigured: boolean;
		stripeConfigured: boolean;
		chapaConfigured: boolean;
		storageDriver: string;
		objectStorageConfigured: boolean;
	};
}

export type ResourceCounts = Record<string, number>;

export const useServerOverview = () =>
	useQuery({
		queryKey: ["admin-server", "overview"],
		queryFn: () => api.get<{ data: ServerOverview }>("/admin/server/overview"),
		select: (r) => r.data,
		refetchInterval: 10_000,
	});

export const useServerResources = () =>
	useQuery({
		queryKey: ["admin-server", "resources"],
		queryFn: () => api.get<{ data: ResourceCounts }>("/admin/server/resources"),
		select: (r) => r.data,
		refetchInterval: 10_000,
	});

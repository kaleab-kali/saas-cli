jest.mock("#modules/admin/guards/super-admin.guard", () => ({
	SuperAdminGuard: class SuperAdminGuard {},
}));

import { HttpStatus } from "@nestjs/common";
import { DetailedHealthController } from "./detailed-health.controller";
import type { DetailedHealthPayload, HealthDiagnosticsService } from "./health-diagnostics.service";

jest.mock("@thallesp/nestjs-better-auth", () => ({
	AllowAnonymous: () => () => undefined,
}));

const payload = (status: DetailedHealthPayload["status"]): DetailedHealthPayload =>
	({
		status,
		timestamp: new Date().toISOString(),
		app: {
			name: "SaaS",
			nodeEnv: "test",
			uptimeSeconds: 10,
			pid: 1,
			nodeVersion: "v20.0.0",
		},
		host: {
			platform: "test",
			arch: "x64",
			hostname: "localhost",
			cpus: 1,
			load1m: 0,
			load5m: 0,
			load15m: 0,
			totalMemoryBytes: 100,
			freeMemoryBytes: 50,
		},
		process: {
			rssBytes: 1,
			heapUsedBytes: 1,
			heapTotalBytes: 2,
			externalBytes: 0,
		},
		http: {
			uptimeSeconds: 10,
			totalRequests: 0,
			totalErrors: 0,
			requestsPerSecond1m: 0,
			errorRate1m: 0,
			p50LatencyMs: 0,
			p95LatencyMs: 0,
			activeRequests: 0,
		},
		dependencies: {
			database: { status: "up", latencyMs: 1 },
			redis: { status: "skipped", latencyMs: 0 },
			disk: { status: "up", latencyMs: 1 },
			memory: { status: "up", latencyMs: 0 },
			eims: { status: "skipped", latencyMs: 0 },
		},
		jobs: {
			status: "up",
			failedLast5m: 0,
			recentRuns: [],
		},
	}) as DetailedHealthPayload;

describe("DetailedHealthController", () => {
	it("wraps detailed health data for admins", async () => {
		const diagnostics = { detailed: jest.fn().mockResolvedValue(payload("ok")) } as unknown as HealthDiagnosticsService;
		const response = { status: jest.fn() };

		const result = await new DetailedHealthController(diagnostics).detailed(response as never);

		expect(response.status).not.toHaveBeenCalled();
		expect(result.data.status).toBe("ok");
	});

	it("returns 503 when a critical dependency is failing", async () => {
		const diagnostics = {
			detailed: jest.fn().mockResolvedValue(payload("error")),
		} as unknown as HealthDiagnosticsService;
		const response = { status: jest.fn() };

		const result = await new DetailedHealthController(diagnostics).detailed(response as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
		expect(result.data.status).toBe("error");
	});
});

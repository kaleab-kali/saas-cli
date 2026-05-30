import { HealthDiagnosticsService } from "./health-diagnostics.service";

const metricSnapshot = {
	uptimeSeconds: 30,
	totalRequests: 10,
	totalErrors: 0,
	requestsPerSecond1m: 0.1,
	errorRate1m: 0,
	p50LatencyMs: 20,
	p95LatencyMs: 80,
	activeRequests: 0,
};

const makeService = (overrides: Partial<Record<string, unknown>> = {}) => {
	const prisma = {
		$queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
		cronJobRun: {
			count: jest.fn().mockResolvedValue(0),
			findMany: jest.fn().mockResolvedValue([]),
		},
		...overrides,
	};
	const metrics = { snapshot: jest.fn(() => metricSnapshot) };
	return {
		service: new HealthDiagnosticsService(prisma as never, metrics as never),
		prisma,
		metrics,
	};
};

describe("HealthDiagnosticsService", () => {
	const originalRedisUrl = process.env.REDIS_URL;
	const originalEimsUrl = process.env.EIMS_API_URL;

	afterEach(() => {
		process.env.REDIS_URL = originalRedisUrl;
		process.env.EIMS_API_URL = originalEimsUrl;
	});

	it("returns readiness with skipped optional Redis when REDIS_URL is missing", async () => {
		delete process.env.REDIS_URL;
		const { service } = makeService();

		const result = await service.readiness();

		expect(result.status).toBe("ok");
		expect(result.dependencies.database.status).toBe("up");
		expect(result.dependencies.redis).toMatchObject({ status: "skipped", reason: "REDIS_URL is not set" });
	});

	it("marks readiness as error when the database check fails", async () => {
		delete process.env.REDIS_URL;
		const { service } = makeService({ $queryRaw: jest.fn().mockRejectedValue(new Error("database offline")) });

		const result = await service.readiness();

		expect(result.status).toBe("error");
		expect(result.dependencies.database).toMatchObject({ status: "down", error: "database offline" });
	});

	it("returns detailed health without leaking configured EIMS secrets", async () => {
		delete process.env.REDIS_URL;
		delete process.env.EIMS_API_URL;
		const { service, metrics } = makeService();

		const result = await service.detailed();

		expect(result.status).toBe("ok");
		expect(result.app).toMatchObject({ nodeVersion: expect.any(String), uptimeSeconds: expect.any(Number) });
		expect(result.dependencies.database.status).toBe("up");
		expect(result.dependencies.eims).toMatchObject({ status: "skipped", reason: "EIMS endpoint is not configured" });
		expect(result.http).toEqual(metricSnapshot);
		expect(metrics.snapshot).toHaveBeenCalled();
		expect(JSON.stringify(result)).not.toMatch(/SECRET|PASSWORD|API_KEY/i);
	});
});

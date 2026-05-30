import { HttpStatus } from "@nestjs/common";
import { HealthController } from "./health.controller";
import type { HealthDiagnosticsService } from "./health-diagnostics.service";

jest.mock("@thallesp/nestjs-better-auth", () => ({
	Public: () => () => undefined,
}));

const makeDiagnostics = (status: "ok" | "error" = "ok", databaseStatus = "up") =>
	({
		readiness: jest.fn().mockResolvedValue({
			status,
			timestamp: new Date().toISOString(),
			dependencies: {
				database: {
					status: databaseStatus,
					latencyMs: 1,
					...(databaseStatus === "down" ? { error: "database offline" } : {}),
				},
				redis: { status: "skipped", latencyMs: 0, reason: "REDIS_URL is not set" },
			},
		}),
	}) as unknown as HealthDiagnosticsService;

const makeController = (diagnostics = makeDiagnostics()) =>
	new HealthController({ check: jest.fn() } as never, { pingCheck: jest.fn() } as never, {} as never, diagnostics);

describe("HealthController", () => {
	const originalRedisUrl = process.env.REDIS_URL;

	afterEach(() => {
		process.env.REDIS_URL = originalRedisUrl;
	});

	it("returns a liveness payload without dependency checks", () => {
		const result = makeController().live();

		expect(result).toMatchObject({ status: "ok" });
		expect(result.uptimeSeconds).toEqual(expect.any(Number));
		expect(result.timestamp).toEqual(expect.any(String));
	});

	it("returns readiness when required dependencies are available", async () => {
		delete process.env.REDIS_URL;
		const response = { status: jest.fn() };

		const result = await makeController().ready(response as never);

		expect(response.status).not.toHaveBeenCalled();
		expect(result.status).toBe("ok");
		expect(result.dependencies.database.status).toBe("up");
		expect(result.dependencies.redis.status).toBe("skipped");
	});

	it("sets 503 readiness when the database is unavailable", async () => {
		delete process.env.REDIS_URL;
		const response = { status: jest.fn() };

		const result = await makeController(makeDiagnostics("error", "down")).ready(response as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
		expect(result.status).toBe("error");
		expect(result.dependencies.database).toMatchObject({ status: "down", error: "database offline" });
	});
});

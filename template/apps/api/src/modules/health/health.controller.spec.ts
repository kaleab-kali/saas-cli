import { HttpStatus } from "@nestjs/common";
import { HealthController } from "./health.controller";

jest.mock("@thallesp/nestjs-better-auth", () => ({
	Public: () => () => undefined,
}));

const makeController = (queryRaw = jest.fn().mockResolvedValue([{ ok: 1 }])) =>
	new HealthController(
		{ check: jest.fn() } as never,
		{ pingCheck: jest.fn() } as never,
		{ $queryRaw: queryRaw } as never,
	);

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
		const queryRaw = jest.fn().mockRejectedValue(new Error("database offline"));

		const result = await makeController(queryRaw).ready(response as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
		expect(result.status).toBe("error");
		expect(result.dependencies.database).toMatchObject({ status: "down", error: "database offline" });
	});
});

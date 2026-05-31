import { ServiceUnavailableException } from "@nestjs/common";
import { EimsSubmissionSourceLockService } from "./eims-submission-source-lock.service";

describe("EimsSubmissionSourceLockService", () => {
	it("runs inline when distributed locks are disabled", async () => {
		const redis = {
			set: jest.fn(),
			eval: jest.fn(),
		};
		const service = new EimsSubmissionSourceLockService({ locksEnabled: false, redis: redis as never });

		await expect(service.withSourceLock("org_1", "src_1", async () => "done")).resolves.toBe("done");
		expect(redis.set).not.toHaveBeenCalled();
	});

	it("acquires, renews, and releases a source-scoped Redis lock", async () => {
		const redis = {
			set: jest.fn().mockResolvedValue("OK"),
			eval: jest.fn().mockResolvedValue(1),
		};
		const service = new EimsSubmissionSourceLockService({
			locksEnabled: true,
			redis: redis as never,
			lockTtlMs: 30_000,
		});

		await expect(service.withSourceLock("org_1", "src_1", async () => "submitted")).resolves.toBe("submitted");
		expect(redis.set).toHaveBeenCalledWith("eims:submission-lock:org_1:src_1", expect.any(String), "PX", 30_000, "NX");
		expect(redis.eval).toHaveBeenCalledWith(
			expect.stringContaining("redis.call"),
			1,
			"eims:submission-lock:org_1:src_1",
			expect.any(String),
		);
	});

	it("fails closed when the source lock cannot be acquired in time", async () => {
		const redis = {
			set: jest.fn().mockResolvedValue(null),
			eval: jest.fn(),
		};
		const service = new EimsSubmissionSourceLockService({
			locksEnabled: true,
			redis: redis as never,
			lockWaitMs: 1,
			sleepMs: async () => undefined,
		});

		await expect(service.withSourceLock("org_1", "src_busy", async () => "never")).rejects.toBeInstanceOf(
			ServiceUnavailableException,
		);
		expect(redis.eval).not.toHaveBeenCalled();
	});
});

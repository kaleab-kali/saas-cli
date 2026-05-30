import { ForbiddenException } from "@nestjs/common";
import fc from "fast-check";
import type { FeatureKey } from "../../domain/value-objects/feature-keys.vo";
import type { EntitlementService } from "./entitlement.service";
import { PolicyService } from "./policy.service";
import type { UsageCurrent, UsageTrackerService } from "./usage-tracker.service";

const usage = (overrides: Partial<UsageCurrent> = {}): UsageCurrent => ({
	userCount: 0,
	apiCallCount: 0,
	emailCount: 0,
	apiKeyCount: 0,
	fileCount: 0,
	storageBytes: 0,
	savedReportCount: 0,
	reportScheduleCount: 0,
	caps: {
		users: null,
		apiKeys: null,
		files: null,
		storageBytes: null,
		savedReports: null,
		reportSchedules: null,
	},
	usagePct: {
		users: 0,
		apiKeys: 0,
		files: 0,
		storageBytes: 0,
		savedReports: 0,
		reportSchedules: 0,
	},
	metrics: {},
	...overrides,
});

type EntitlementMap = Partial<Record<FeatureKey, { enabled: boolean; limit: number | null }>>;

const makeHarness = (current: UsageCurrent, limit: number | null, entitlementMap?: EntitlementMap) => {
	const entitlements = {
		assertCan: jest.fn().mockResolvedValue(undefined),
		can: jest.fn().mockResolvedValue({ allowed: true, reason: "enabled", limit }),
		getEntitlementMap: jest.fn().mockResolvedValue(
			entitlementMap ?? {
				"platform.api-keys": { enabled: true, limit },
			},
		),
	} as unknown as EntitlementService;
	const tracker = {
		getCurrent: jest.fn().mockResolvedValue(current),
	} as unknown as UsageTrackerService;
	return {
		entitlements,
		service: new PolicyService(entitlements, tracker),
		tracker,
	};
};

const makeService = (current: UsageCurrent, limit: number | null, entitlementMap?: EntitlementMap) =>
	makeHarness(current, limit, entitlementMap).service;

describe("PolicyService properties", () => {
	it("delegates feature access checks to the entitlement service", async () => {
		const { entitlements, service } = makeHarness(usage(), 1);

		await service.assertFeature("org_1", "platform.api-keys");

		expect(entitlements.assertCan).toHaveBeenCalledWith("org_1", "platform.api-keys");
	});

	it("allows usage while the next value is inside the entitlement limit", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 20 }), async (used, remaining) => {
				const limit = used + remaining;
				const service = makeService(usage({ apiKeyCount: used }), limit);
				await expect(service.assertWithinLimit("org_1", "platform.api-keys")).resolves.toBeUndefined();
			}),
		);
	});

	it("treats a null entitlement limit as unlimited", async () => {
		const service = makeService(usage({ apiKeyCount: 50_000 }), null);

		await expect(service.assertWithinLimit("org_1", "platform.api-keys", 50_000)).resolves.toBeUndefined();
	});

	it("rejects usage when the next value exceeds the entitlement limit", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 20 }), async (limit, overage) => {
				const service = makeService(usage({ apiKeyCount: limit + overage }), limit);
				await expect(service.assertWithinLimit("org_1", "platform.api-keys")).rejects.toBeInstanceOf(
					ForbiddenException,
				);
			}),
		);
	});

	it("returns a stable limit error payload when usage exceeds the plan", async () => {
		const service = makeService(usage({ apiKeyCount: 10 }), 10);

		try {
			await service.assertWithinLimit("org_1", "platform.api-keys", 2);
			throw new Error("Expected usage cap to be rejected");
		} catch (err) {
			expect(err).toBeInstanceOf(ForbiddenException);
			expect((err as ForbiddenException).getResponse()).toMatchObject({
				code: "USAGE_CAP_EXCEEDED",
				message: "Feature 'platform.api-keys' limit exceeded for the current plan",
				featureKey: "platform.api-keys",
				limit: 10,
				current: 10,
				next: 12,
			});
		}
	});

	it("never reports negative remaining capabilities", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 0, max: 100 }), async (limit, used) => {
				const service = makeService(usage({ apiKeyCount: used }), limit);
				const capabilities = await service.capabilities("org_1");
				expect(capabilities["platform.api-keys"].remaining).toBeGreaterThanOrEqual(0);
			}),
		);
	});

	it("reports null remaining capacity for unlimited and non-usage capabilities", async () => {
		const service = makeService(usage({ apiKeyCount: 25 }), null, {
			"platform.api-keys": { enabled: true, limit: null },
			"platform.branding": { enabled: true, limit: 10 },
		});

		const capabilities = await service.capabilities("org_1");

		expect(capabilities["platform.api-keys"]).toMatchObject({ limit: null, used: 25, remaining: null });
		expect(capabilities["platform.branding"]).toMatchObject({ limit: 10, used: null, remaining: null });
	});

	it("defaults missing entitlements to disabled capabilities", async () => {
		const service = makeService(usage(), null, {});

		const capabilities = await service.capabilities("org_1");

		expect(capabilities["platform.api-keys"]).toMatchObject({
			enabled: false,
			limit: null,
			reason: "not-in-plan",
		});
	});

	it("maps every centralized usage metric into capabilities", async () => {
		const service = makeService(
			usage({
				userCount: 3,
				apiCallCount: 12,
				emailCount: 11,
				apiKeyCount: 4,
				fileCount: 5,
				storageBytes: 600,
				savedReportCount: 7,
				reportScheduleCount: 8,
			}),
			10,
			{
				"platform.members": { enabled: true, limit: 10 },
				"platform.custom-fields": { enabled: true, limit: 10 },
				"platform.api-keys": { enabled: true, limit: 10 },
				"platform.api-requests-per-minute": { enabled: true, limit: 60 },
				"platform.file-count": { enabled: true, limit: 10 },
				"platform.storage-bytes": { enabled: true, limit: 1_000 },
				"notifications.bulk-email": { enabled: true, limit: 100 },
				"reporting.custom-report-builder": { enabled: true, limit: 10 },
				"reporting.schedule-delivery": { enabled: true, limit: 10 },
				"platform.branding": { enabled: true, limit: null },
				"platform.file-upload": { enabled: false, limit: null },
			},
		);

		const capabilities = await service.capabilities("org_1");

		expect(capabilities["platform.members"]).toMatchObject({ enabled: true, used: 3, remaining: 7 });
		expect(capabilities["platform.custom-fields"]).toMatchObject({ enabled: true, used: 0, remaining: 10 });
		expect(capabilities["platform.api-keys"]).toMatchObject({ enabled: true, used: 4, remaining: 6 });
		expect(capabilities["platform.api-requests-per-minute"]).toMatchObject({ enabled: true, used: 12, remaining: 48 });
		expect(capabilities["platform.file-count"]).toMatchObject({ enabled: true, used: 5, remaining: 5 });
		expect(capabilities["platform.storage-bytes"]).toMatchObject({ enabled: true, used: 600, remaining: 400 });
		expect(capabilities["notifications.bulk-email"]).toMatchObject({ enabled: true, used: 11, remaining: 89 });
		expect(capabilities["reporting.custom-report-builder"]).toMatchObject({ enabled: true, used: 7, remaining: 3 });
		expect(capabilities["reporting.schedule-delivery"]).toMatchObject({ enabled: true, used: 8, remaining: 2 });
		expect(capabilities["platform.branding"]).toMatchObject({
			enabled: true,
			used: null,
			remaining: null,
			reason: "enabled",
		});
		expect(capabilities["platform.file-upload"]).toMatchObject({
			enabled: false,
			used: null,
			remaining: null,
			reason: "not-in-plan",
		});
	});
});

const mockTenantGetSession = jest.fn();
const mockAdminGetSession = jest.fn();
const mockFromNodeHeaders = jest.fn((headers: unknown) => headers);

jest.mock("#modules/auth/auth.config", () => ({
	auth: { api: { getSession: mockTenantGetSession } },
}));

jest.mock("#modules/admin/auth/admin-auth.config", () => ({
	adminAuth: { api: { getSession: mockAdminGetSession } },
}));

jest.mock("better-auth/node", () => ({
	fromNodeHeaders: mockFromNodeHeaders,
}));

import { TenantThrottlerGuard } from "./tenant-throttler.guard";

class TestTenantThrottlerGuard extends TenantThrottlerGuard {
	track(req: Record<string, unknown>) {
		return this.getTracker(req);
	}
}

const makeGuard = () => new TestTenantThrottlerGuard({ throttlers: [] } as never, {} as never, {} as never);

describe("TenantThrottlerGuard", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("uses an organization tracker when request context already has one", async () => {
		const req = { organizationId: "org_1", headers: {} };

		await expect(makeGuard().track(req)).resolves.toBe("tenant:org_1");
		expect(mockTenantGetSession).not.toHaveBeenCalled();
		expect(mockAdminGetSession).not.toHaveBeenCalled();
	});

	it("resolves tenant session before falling back to IP", async () => {
		const req = { headers: { cookie: "tenant-cookie" } };
		mockTenantGetSession.mockResolvedValue({
			session: { id: "sess_1", activeOrganizationId: "org_2" },
			user: { id: "user_1" },
		});

		await expect(makeGuard().track(req)).resolves.toBe("tenant:org_2");
		expect(req).toMatchObject({ organizationId: "org_2" });
		expect(mockFromNodeHeaders).toHaveBeenCalledWith(req.headers);
		expect(mockAdminGetSession).not.toHaveBeenCalled();
	});

	it("resolves admin sessions separately from tenant traffic", async () => {
		const req = { headers: { cookie: "admin-cookie" } };
		mockTenantGetSession.mockResolvedValue(null);
		mockAdminGetSession.mockResolvedValue({
			session: { id: "admin_session_1" },
			user: { id: "admin_1" },
		});

		await expect(makeGuard().track(req)).resolves.toBe("admin:admin_1");
		expect(req).toMatchObject({ adminUser: { id: "admin_1" }, adminSession: { id: "admin_session_1" } });
	});

	it("falls back to forwarded client IP for anonymous traffic", async () => {
		const req = { headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" } };
		mockTenantGetSession.mockRejectedValue(new Error("no tenant session"));
		mockAdminGetSession.mockResolvedValue(null);

		await expect(makeGuard().track(req)).resolves.toBe("ip:203.0.113.10");
	});
});

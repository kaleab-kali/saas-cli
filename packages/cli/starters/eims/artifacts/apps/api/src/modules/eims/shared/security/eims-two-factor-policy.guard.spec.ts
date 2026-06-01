import { ForbiddenException } from "@nestjs/common";
import { EimsTwoFactorPolicyGuard } from "./eims-two-factor-policy.guard";

const makeContext = (request: Record<string, unknown> = {}) =>
	({
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	}) as never;

describe("EimsTwoFactorPolicyGuard", () => {
	const originalEnv = { ...process.env };
	const findUnique = jest.fn();
	const guard = () =>
		new EimsTwoFactorPolicyGuard({
			securitySettings: { findUnique },
		} as never);

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.EIMS_ENV;
		delete process.env.EIMS_REQUIRE_2FA;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it("does not block local mock and sandbox flows when 2FA is not required", async () => {
		await expect(guard().canActivate(makeContext())).resolves.toBe(true);

		expect(findUnique).not.toHaveBeenCalled();
	});

	it("requires force2fa when the explicit EIMS policy flag is enabled", async () => {
		process.env.EIMS_REQUIRE_2FA = "true";
		findUnique.mockResolvedValue({ force2fa: true });

		await expect(guard().canActivate(makeContext({ organizationId: "org_1" }))).resolves.toBe(true);

		expect(findUnique).toHaveBeenCalledWith({
			where: { organizationId: "org_1" },
			select: { force2fa: true },
		});
	});

	it("requires force2fa automatically in EIMS production mode", async () => {
		process.env.EIMS_ENV = "production";
		findUnique.mockResolvedValue({ force2fa: true });

		await expect(
			guard().canActivate(makeContext({ session: { session: { activeOrganizationId: "org_session" } } })),
		).resolves.toBe(true);

		expect(findUnique).toHaveBeenCalledWith({
			where: { organizationId: "org_session" },
			select: { force2fa: true },
		});
	});

	it("rejects EIMS production access when no active organization is available", async () => {
		process.env.EIMS_ENV = "production";

		await expect(guard().canActivate(makeContext())).rejects.toThrow(ForbiddenException);

		expect(findUnique).not.toHaveBeenCalled();
	});

	it("rejects EIMS production access until the tenant force2fa policy is enabled", async () => {
		process.env.EIMS_ENV = "production";
		findUnique.mockResolvedValue({ force2fa: false });

		await expect(guard().canActivate(makeContext({ organizationId: "org_1" }))).rejects.toThrow(ForbiddenException);
	});
});

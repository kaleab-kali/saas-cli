const mockHasPermission = jest.fn();

jest.mock("../auth.config", () => ({
	auth: { api: { hasPermission: mockHasPermission } },
}));

import { ForbiddenException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";

const makeContext = (headers: Record<string, string | string[] | undefined> = {}) =>
	({
		getClass: jest.fn(),
		getHandler: jest.fn(),
		switchToHttp: () => ({
			getRequest: () => ({ headers }),
		}),
	}) as never;

const makeGuard = (requiredPermissions: string[] | undefined) => {
	const reflector = {
		getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
	};
	return {
		guard: new PermissionsGuard(reflector as never),
		reflector,
	};
};

describe("PermissionsGuard", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("allows routes without declared permissions", async () => {
		const { guard, reflector } = makeGuard(undefined);

		await expect(guard.canActivate(makeContext())).resolves.toBe(true);

		expect(reflector.getAllAndOverride).toHaveBeenCalled();
		expect(mockHasPermission).not.toHaveBeenCalled();
	});

	it("checks every required permission using Fetch API headers", async () => {
		mockHasPermission.mockResolvedValue({ success: true });
		const { guard } = makeGuard(["billing:read", "team:write"]);

		await expect(
			guard.canActivate(
				makeContext({
					cookie: "session=abc",
					"x-forwarded-for": ["203.0.113.10", "10.0.0.1"],
				}),
			),
		).resolves.toBe(true);

		expect(mockHasPermission).toHaveBeenCalledTimes(2);
		expect(mockHasPermission).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				body: { permissions: { billing: ["read"] } },
				headers: expect.any(Headers),
			}),
		);
		expect(mockHasPermission).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				body: { permissions: { team: ["write"] } },
				headers: expect.any(Headers),
			}),
		);
		const headers = mockHasPermission.mock.calls[0][0].headers as Headers;
		expect(headers.get("cookie")).toBe("session=abc");
		expect(headers.get("x-forwarded-for")).toContain("203.0.113.10");
	});

	it("rejects as soon as one required permission is missing", async () => {
		mockHasPermission.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
		const { guard } = makeGuard(["billing:read", "team:write"]);

		await expect(guard.canActivate(makeContext())).rejects.toThrow(ForbiddenException);

		expect(mockHasPermission).toHaveBeenCalledTimes(2);
	});
});

import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of, throwError } from "rxjs";
import { AuditAction, AuditResource } from "#shared/decorators/audit.decorator";
import { AuditInterceptor } from "./audit.interceptor";

const makeContext = (
	request: Record<string, unknown>,
	handler: () => void = function handler() {},
	controller: new () => unknown = class Controller {},
): ExecutionContext =>
	({
		getClass: () => controller,
		getHandler: () => handler,
		switchToHttp: () => ({
			getRequest: () => request,
		}),
	}) as never;

const makeInterceptor = () => {
	const logger = {
		info: jest.fn(),
		setContext: jest.fn(),
		warn: jest.fn(),
	};
	const persistence = {
		record: jest.fn(),
	};
	return {
		interceptor: new AuditInterceptor(logger as never, persistence as never, new Reflector()),
		logger,
		persistence,
	};
};

class DecoratedController {
	completeStep() {}
}

const completeStepDescriptor = Object.getOwnPropertyDescriptor(DecoratedController.prototype, "completeStep");
if (!completeStepDescriptor) throw new Error("completeStep descriptor missing");

AuditResource("onboarding:task")(DecoratedController);
AuditAction("complete_step")(DecoratedController.prototype, "completeStep", completeStepDescriptor);

describe("AuditInterceptor", () => {
	it("skips read-only requests", (done) => {
		const { interceptor, logger, persistence } = makeInterceptor();
		const next = { handle: jest.fn(() => of({ ok: true })) };

		interceptor.intercept(makeContext({ method: "GET", url: "/api/v1/team", headers: {} }), next).subscribe({
			complete: () => {
				expect(next.handle).toHaveBeenCalled();
				expect(logger.info).not.toHaveBeenCalled();
				expect(persistence.record).not.toHaveBeenCalled();
				done();
			},
		});
	});

	it("persists a redacted success audit record for mutating requests", (done) => {
		const { interceptor, logger, persistence } = makeInterceptor();
		const request = {
			body: {
				displayName: "Demo Cafe",
				nested: { apiKey: "secret-key" },
				password: "secret-password",
			},
			headers: {
				"user-agent": "jest",
				"x-correlation-id": "corr_1",
			},
			ip: "203.0.113.10",
			method: "PATCH",
			organizationId: "org_1",
			params: { id: "org_1" },
			session: { user: { email: "owner@example.test", id: "user_1" } },
			url: "/api/v1/organizations/org_1/settings",
		};
		const next = { handle: jest.fn(() => of({ ok: true })) };

		interceptor.intercept(makeContext(request), next).subscribe({
			complete: () => {
				expect(logger.info).toHaveBeenCalledWith(
					expect.objectContaining({ action: "UPDATE", resource: "organizations" }),
					"UPDATE organizations completed",
				);
				expect(persistence.record).toHaveBeenCalledWith(
					expect.objectContaining({
						action: "UPDATE",
						correlationId: "corr_1",
						organizationId: "org_1",
						resource: "organizations",
						resourceId: "org_1",
						status: "success",
						userEmail: "owner@example.test",
						userId: "user_1",
						metadata: expect.objectContaining({
							body: {
								displayName: "Demo Cafe",
								nested: { apiKey: "[REDACTED]" },
								password: "[REDACTED]",
							},
							durationMs: expect.any(Number),
							params: { id: "org_1" },
						}),
					}),
				);
				done();
			},
		});
	});

	it("persists failure audit records without treating route verbs as resource IDs", (done) => {
		const { interceptor, logger, persistence } = makeInterceptor();
		const error = new Error("write failed");
		const next = { handle: jest.fn(() => throwError(() => error)) };

		interceptor
			.intercept(
				makeContext({
					body: {},
					headers: {},
					method: "POST",
					params: {},
					socket: { remoteAddress: "198.51.100.1" },
					url: "/api/v1/reports/export",
				}),
				next,
			)
			.subscribe({
				error: () => {
					expect(logger.warn).toHaveBeenCalledWith(
						expect.objectContaining({ error: "write failed" }),
						"CREATE reports failed",
					);
					expect(persistence.record).toHaveBeenCalledWith(
						expect.objectContaining({
							action: "CREATE",
							errorMessage: "write failed",
							ipAddress: "198.51.100.1",
							resource: "reports",
							resourceId: null,
							status: "failure",
						}),
					);
					done();
				},
			});
	});

	it("uses explicit audit metadata when decorators are present", (done) => {
		const { interceptor, logger, persistence } = makeInterceptor();
		const request = {
			body: {},
			headers: { "x-correlation-id": "corr_2" },
			method: "POST",
			organizationId: "org_1",
			params: { id: "task_1", stepKey: "tenant-info-collected" },
			url: "/api/v1/admin/onboarding/task_1/steps/tenant-info-collected/complete",
		};
		const next = { handle: jest.fn(() => of({ ok: true })) };

		interceptor
			.intercept(makeContext(request, DecoratedController.prototype.completeStep, DecoratedController), next)
			.subscribe({
				complete: () => {
					expect(logger.info).toHaveBeenCalledWith(
						expect.objectContaining({ action: "complete_step", resource: "onboarding:task" }),
						"complete_step onboarding:task completed",
					);
					expect(persistence.record).toHaveBeenCalledWith(
						expect.objectContaining({
							action: "complete_step",
							correlationId: "corr_2",
							resource: "onboarding:task",
							status: "success",
						}),
					);
					done();
				},
			});
	});
});

import { BadRequestException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { DomainError } from "#shared/errors/domain-error";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";
import { GlobalExceptionFilter } from "./global-exception.filter";

const makeHost = () => {
	const response = {
		json: jest.fn(),
		status: jest.fn().mockReturnThis(),
	};
	const request = {
		headers: { [CORRELATION_ID_HEADER]: "corr_1" },
		method: "POST",
		organizationId: "org_1",
		url: "/api/v1/private/path",
	};
	const host = {
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => response,
		}),
	};
	return { host, request, response };
};

const makeFilter = () => {
	const logger = {
		error: jest.fn(),
		setContext: jest.fn(),
		warn: jest.fn(),
	};
	return {
		filter: new GlobalExceptionFilter(logger as never),
		logger,
	};
};

describe("GlobalExceptionFilter", () => {
	it("sanitizes Nest 404 route messages before sending client responses", () => {
		const { filter, logger } = makeFilter();
		const { host, response } = makeHost();

		filter.catch(new NotFoundException("Cannot POST /api/v1/private/path"), host as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
		expect(response.json).toHaveBeenCalledWith({
			error: { code: "NOT_FOUND", message: "Resource not found" },
		});
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: "corr_1",
				method: "POST",
				organizationId: "org_1",
				path: "/api/v1/private/path",
				statusCode: HttpStatus.NOT_FOUND,
			}),
			"NOT_FOUND: Resource not found",
		);
	});

	it("joins validation messages and strips internal API path fragments", () => {
		const { filter } = makeFilter();
		const { host, response } = makeHost();
		const exception = new BadRequestException({
			message: ["name is required", "invalid /api/v1/private/secret value"],
		});

		filter.catch(exception, host as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
		expect(response.json).toHaveBeenCalledWith({
			error: { code: "BAD_REQUEST", message: "name is required, invalid  value" },
		});
	});

	it("returns a generic 500 response while logging server errors", () => {
		const { filter, logger } = makeFilter();
		const { host, response } = makeHost();
		const error = new Error("database password leaked in stack");

		filter.catch(error, host as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
		expect(response.json).toHaveBeenCalledWith({
			error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
		});
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				err: error,
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			}),
			"INTERNAL_SERVER_ERROR: Internal server error",
		);
	});

	it("falls back to an internal error message for unhelpful HttpException bodies", () => {
		const { filter } = makeFilter();
		const { host, response } = makeHost();

		filter.catch(new HttpException({ detail: "missing message" }, HttpStatus.CONFLICT), host as never);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
		expect(response.json).toHaveBeenCalledWith({
			error: { code: "CONFLICT", message: "Internal server error" },
		});
	});

	it("maps typed domain errors to safe client responses", () => {
		const { filter, logger } = makeFilter();
		const { host, response } = makeHost();

		filter.catch(
			new DomainError({
				code: "ONBOARDING_STEP_BLOCKED",
				message: "This onboarding step is blocked",
				status: HttpStatus.CONFLICT,
				details: { internalWorkflowState: "secret" },
			}),
			host as never,
		);

		expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
		expect(response.json).toHaveBeenCalledWith({
			error: { code: "ONBOARDING_STEP_BLOCKED", message: "This onboarding step is blocked" },
		});
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				correlationId: "corr_1",
				statusCode: HttpStatus.CONFLICT,
			}),
			"ONBOARDING_STEP_BLOCKED: This onboarding step is blocked",
		);
	});
});

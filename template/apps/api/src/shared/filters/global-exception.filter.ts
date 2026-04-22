import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(GlobalExceptionFilter.name);
	}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		const message =
			exception instanceof HttpException
				? typeof exception.getResponse() === "string"
					? exception.getResponse()
					: ((exception.getResponse() as Record<string, unknown>).message as string) || "Internal server error"
				: "Internal server error";

		const code = HttpStatus[status] || "INTERNAL_ERROR";

		const logPayload = {
			statusCode: status,
			path: request.url,
			method: request.method,
			correlationId: request.headers[CORRELATION_ID_HEADER],
			organizationId: (request as unknown as Record<string, unknown>).organizationId,
			...(exception instanceof Error ? { err: exception } : {}),
		};

		if (status >= 500) {
			this.logger.error(logPayload, `${code}: ${message}`);
		} else {
			this.logger.warn(logPayload, `${code}: ${message}`);
		}

		response.status(status).json({
			error: {
				code,
				message,
				...(process.env.NODE_ENV !== "production" && exception instanceof Error ? { stack: exception.stack } : {}),
			},
		});
	}
}

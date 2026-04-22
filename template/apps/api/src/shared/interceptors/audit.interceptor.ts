import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { PinoLogger } from "nestjs-pino";
import { Observable, tap } from "rxjs";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";
import { redactSensitiveFields } from "#shared/logger/redact.util";

const METHOD_ACTION_MAP: Record<string, string> = {
	POST: "CREATE",
	PUT: "UPDATE",
	PATCH: "UPDATE",
	DELETE: "DELETE",
} as const;

const extractResource = (path: string): string => {
	const segments = path.replace(/^\/api\/v1\//, "").split("/");
	return segments[0] || "unknown";
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(AuditInterceptor.name);
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const { method, url, body, params } = request;

		// Skip read-only methods
		if (method === "GET" || method === "OPTIONS" || method === "HEAD") {
			return next.handle();
		}

		const action = METHOD_ACTION_MAP[method] || method;
		const resource = extractResource(url);
		const correlationId = request.headers[CORRELATION_ID_HEADER] as string;
		const req = request as unknown as Record<string, unknown>;
		const session = req.session as Record<string, unknown> | undefined;
		const user = session?.user as Record<string, unknown> | undefined;
		const userId = user?.id;
		const organizationId = req.organizationId;
		const startTime = Date.now();

		return next.handle().pipe(
			tap({
				next: () => {
					this.logger.info(
						{
							audit: true,
							action,
							resource,
							correlationId,
							userId,
							organizationId,
							params,
							body: redactSensitiveFields(body),
							duration: Date.now() - startTime,
						},
						`${action} ${resource} completed`,
					);
				},
				error: (error: Error) => {
					this.logger.warn(
						{
							audit: true,
							action,
							resource,
							correlationId,
							userId,
							organizationId,
							error: error.message,
							duration: Date.now() - startTime,
						},
						`${action} ${resource} failed`,
					);
				},
			}),
		);
	}
}

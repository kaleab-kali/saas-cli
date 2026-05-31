import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PinoLogger } from "nestjs-pino";
import { Observable, tap } from "rxjs";
import { AuditPersistenceService } from "#modules/audit-log/application/services/audit-persistence.service";
import { AUDIT_ACTION_KEY, AUDIT_RESOURCE_KEY } from "#shared/decorators/audit.decorator";
import { CORRELATION_ID_HEADER } from "#shared/logger/logger.constants";
import { redactSensitiveFields } from "#shared/logger/redact.util";

const METHOD_ACTION_MAP: Record<string, string> = {
	POST: "CREATE",
	PUT: "UPDATE",
	PATCH: "UPDATE",
	DELETE: "DELETE",
} as const;

const extractResource = (path: string): string => {
	const segments = path.replace(/^\/api\/v[0-9]+\//, "").split("/");
	return segments[0] || "unknown";
};

const extractResourceId = (path: string): string | null => {
	const segments = path.replace(/^\/api\/v[0-9]+\//, "").split("/");
	// Convention: /resource/:id/...  — id is segment[1] if non-empty and not a route verb
	const candidate = segments[1];
	if (!candidate) return null;
	// Skip common action verbs
	if (["export", "import", "search", "bulk"].includes(candidate)) return null;
	return candidate;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
	constructor(
		private readonly logger: PinoLogger,
		private readonly persistence: AuditPersistenceService,
		private readonly reflector: Reflector,
	) {
		this.logger.setContext(AuditInterceptor.name);
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const { method, url, body, params } = request;

		// Skip read-only methods
		if (method === "GET" || method === "OPTIONS" || method === "HEAD") {
			return next.handle();
		}

		const action =
			this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]) ??
			METHOD_ACTION_MAP[method] ??
			method;
		const resource =
			this.reflector.getAllAndOverride<string>(AUDIT_RESOURCE_KEY, [context.getHandler(), context.getClass()]) ??
			extractResource(url);
		const resourceId = extractResourceId(url);
		const correlationId = request.headers[CORRELATION_ID_HEADER] as string;
		const req = request as unknown as Record<string, unknown>;
		const session = req.session as Record<string, unknown> | undefined;
		const user = session?.user as Record<string, unknown> | undefined;
		const userId = (user?.id as string | undefined) ?? null;
		const userEmail = (user?.email as string | undefined) ?? null;
		const organizationId = req.organizationId as string | undefined;
		const ipAddress = request.ip ?? request.socket?.remoteAddress ?? null;
		const userAgent = (request.headers["user-agent"] as string | undefined) ?? null;
		const startTime = Date.now();

		const persist = (status: "success" | "failure", errorMessage: string | null) => {
			this.persistence.record({
				organizationId,
				userId,
				userEmail,
				action,
				resource,
				resourceId,
				correlationId,
				ipAddress,
				userAgent,
				metadata: { params, body: redactSensitiveFields(body), durationMs: Date.now() - startTime },
				status,
				errorMessage,
			});
		};

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
					persist("success", null);
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
					persist("failure", error.message);
				},
			}),
		);
	}
}

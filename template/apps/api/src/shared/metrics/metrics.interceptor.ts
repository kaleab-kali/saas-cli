import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
	constructor(private readonly metrics: MetricsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const started = Date.now();
		let statusCode = 200;
		this.metrics.beginRequest();

		return next.handle().pipe(
			tap({
				next: () => {
					statusCode = response.statusCode;
				},
				error: (error: { getStatus?: () => number }) => {
					statusCode = error.getStatus?.() ?? response.statusCode ?? 500;
					this.record(request, statusCode, Date.now() - started);
				},
				complete: () => {
					this.record(request, statusCode, Date.now() - started);
				},
			}),
		);
	}

	private record(request: Request, statusCode: number, durationMs: number) {
		const route = request.route?.path ? `${request.baseUrl}${request.route.path}` : request.path;
		this.metrics.endRequest(request.method, route || "unknown", statusCode, durationMs);
	}
}

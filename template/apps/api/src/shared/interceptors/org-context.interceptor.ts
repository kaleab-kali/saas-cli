import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { TenantContext } from "#shared/database/tenant-context";

@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
	constructor(private readonly tenant: TenantContext) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest();
		const session = request.session;
		const organizationId: string | undefined = session?.session?.activeOrganizationId ?? request.organizationId;
		const userId: string | undefined = session?.user?.id;

		if (organizationId) request.organizationId = organizationId;

		if (!organizationId) return next.handle();

		// Run the rest of the request inside the tenant AsyncLocalStorage so any Prisma query
		// downstream can read organizationId from TenantContext.
		return new Observable((subscriber) => {
			this.tenant.run({ organizationId, userId }, () => {
				const sub = next.handle().subscribe({
					next: (v) => subscriber.next(v),
					error: (e) => subscriber.error(e),
					complete: () => subscriber.complete(),
				});
				return () => sub.unsubscribe();
			});
		});
	}
}

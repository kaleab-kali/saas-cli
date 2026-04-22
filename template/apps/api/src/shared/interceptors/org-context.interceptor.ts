import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class OrgContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest();
		const session = request.session;

		if (session?.session?.activeOrganizationId) {
			request.organizationId = session.session.activeOrganizationId;
		}

		return next.handle();
	}
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { auth } from "../auth.config";

export const PERMISSIONS_KEY = "permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredPermissions || requiredPermissions.length === 0) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		// Better Auth expects Fetch-API style Headers, not express plain object.
		const hdrs = new Headers();
		for (const [k, v] of Object.entries(request.headers)) {
			if (Array.isArray(v)) for (const x of v) hdrs.append(k, String(x));
			else if (v != null) hdrs.set(k, String(v));
		}
		const headers = hdrs;

		for (const permission of requiredPermissions) {
			const [resource, action] = permission.split(":");
			const result = await auth.api.hasPermission({
				headers,
				body: { permissions: { [resource]: [action] } },
			});
			if (!result?.success) {
				throw new ForbiddenException(`Missing permission: ${permission}`);
			}
		}

		return true;
	}
}

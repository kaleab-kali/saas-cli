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
		const headers = request.headers;

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

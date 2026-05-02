import {
	CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { PrismaService } from "#shared/database/prisma.service";

// Platform role hierarchy. Higher index = more powerful. Used for `requireMin`.
export const PLATFORM_ROLES = ["readOnly", "support", "billingAdmin", "superAdmin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const ROLE_RANK: Record<PlatformRole, number> = {
	readOnly: 0,
	support: 1,
	billingAdmin: 2,
	superAdmin: 3,
};

const META_REQUIRE_ROLES = "admin.requireRoles";
const META_REQUIRE_MIN = "admin.requireMin";

/** Decorator: require any of these platform roles. */
export const RequirePlatformRole = (...roles: PlatformRole[]) => SetMetadata(META_REQUIRE_ROLES, roles);

/** Decorator: require at least this rank (e.g. billingAdmin allows superAdmin too). */
export const RequirePlatformMin = (min: PlatformRole) => SetMetadata(META_REQUIRE_MIN, min);

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const session = await adminAuth.api.getSession({ headers: fromNodeHeaders(request.headers) });
		if (!session?.user) throw new UnauthorizedException("Admin authentication required");

		const adminUser = await this.prisma.adminUser.findUnique({
			where: { id: session.user.id },
			select: { id: true, email: true, role: true },
		});
		if (!adminUser) throw new UnauthorizedException("Admin user not found");
		const role = (adminUser.role ?? "superAdmin") as PlatformRole;

		const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[] | undefined>(META_REQUIRE_ROLES, [
			context.getHandler(),
			context.getClass(),
		]);
		const requiredMin = this.reflector.getAllAndOverride<PlatformRole | undefined>(META_REQUIRE_MIN, [
			context.getHandler(),
			context.getClass(),
		]);

		if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
			throw new ForbiddenException(`Requires one of: ${requiredRoles.join(", ")}`);
		}
		if (requiredMin && ROLE_RANK[role] < ROLE_RANK[requiredMin]) {
			throw new ForbiddenException(`Requires platform role >= ${requiredMin}`);
		}

		request.adminUser = { ...session.user, role };
		request.adminSession = session.session;
		return true;
	}
}

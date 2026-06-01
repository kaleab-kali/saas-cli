import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

interface EimsPolicyRequest {
	organizationId?: string;
	session?: {
		session?: {
			activeOrganizationId?: string | null;
		};
	};
}

const isTwoFactorPolicyRequired = () =>
	process.env.EIMS_ENV === "production" || process.env.EIMS_REQUIRE_2FA === "true";

@Injectable()
export class EimsTwoFactorPolicyGuard implements CanActivate {
	constructor(private readonly prisma: PrismaService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!isTwoFactorPolicyRequired()) return true;

		const request = context.switchToHttp().getRequest<EimsPolicyRequest>();
		const organizationId = request.organizationId ?? request.session?.session?.activeOrganizationId ?? undefined;
		if (!organizationId) {
			throw new ForbiddenException("EIMS access requires an active organization before 2FA policy can be verified");
		}

		const settings = await this.prisma.securitySettings.findUnique({
			where: { organizationId },
			select: { force2fa: true },
		});
		if (settings?.force2fa === true) return true;

		throw new ForbiddenException("EIMS production access requires organization 2FA enforcement");
	}
}

import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsComplianceService } from "../application/eims-compliance.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims/compliance")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsComplianceController {
	constructor(private readonly compliance: EimsComplianceService) {}

	@Get("evidence")
	@RequirePermissions("eims-compliance:read")
	evidence(@Req() req: AuthedRequest) {
		return this.compliance.generateEvidencePackage(req.organizationId);
	}
}

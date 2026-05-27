import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsAcceptanceService } from "../application/eims-acceptance.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims/acceptance")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsAcceptanceController {
	constructor(private readonly acceptance: EimsAcceptanceService) {}

	@Get("cases")
	@RequirePermissions("eims-compliance:read")
	cases() {
		return this.acceptance.listCases();
	}

	@Get("cases/:caseId")
	@RequirePermissions("eims-compliance:read")
	caseDetail(@Param("caseId") caseId: string) {
		return this.acceptance.getCase(caseId);
	}

	@Post("cases/:caseId/run")
	@RequirePermissions("eims-compliance:export")
	runCase(@Req() req: AuthedRequest, @Param("caseId") caseId: string) {
		return this.acceptance.runCase(req.organizationId, caseId);
	}

	@Post("run-all")
	@RequirePermissions("eims-compliance:export")
	runAll(@Req() req: AuthedRequest, @Body() _body: Record<string, unknown>) {
		return this.acceptance.runAll(req.organizationId);
	}
}

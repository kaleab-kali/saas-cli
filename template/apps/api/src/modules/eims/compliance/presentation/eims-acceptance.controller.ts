import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { EimsAcceptanceService } from "../application/eims-acceptance.service";

@Controller("admin/eims/acceptance")
@AllowAnonymous()
@UseGuards(SuperAdminGuard)
export class EimsAcceptanceController {
	constructor(private readonly acceptance: EimsAcceptanceService) {}

	@Get("cases")
	cases() {
		return this.acceptance.listCases();
	}

	@Get("cases/:caseId")
	caseDetail(@Param("caseId") caseId: string) {
		return this.acceptance.getCase(caseId);
	}

	@Post("cases/:caseId/run")
	runCase(@Param("caseId") caseId: string) {
		return this.acceptance.runCase("platform", caseId);
	}

	@Post("run-all")
	runAll(@Body() _body: Record<string, unknown>) {
		return this.acceptance.runAll("platform");
	}
}

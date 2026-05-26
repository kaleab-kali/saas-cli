import { Controller, Get, UseGuards } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { EimsAdminService } from "../application/eims-admin.service";

@Controller("admin/eims")
@AllowAnonymous()
@UseGuards(SuperAdminGuard)
export class EimsAdminController {
	constructor(private readonly admin: EimsAdminService) {}

	@Get("overview")
	overview() {
		return this.admin.overview();
	}

	@Get("tenants")
	tenants() {
		return this.admin.tenants();
	}

	@Get("failures")
	failures() {
		return this.admin.failures();
	}

	@Get("certificates")
	certificates() {
		return this.admin.certificates();
	}

	@Get("resources")
	resources() {
		return this.admin.resources();
	}

	@Get("compliance")
	compliance() {
		return this.admin.compliance();
	}
}

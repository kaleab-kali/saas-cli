import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsMockService } from "../mock/eims-mock.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSupportingResourcesController {
	constructor(private readonly mock: EimsMockService) {}

	@Get("credentials")
	@RequirePermissions("eims-credential:read")
	credentials(@Req() req: AuthedRequest) {
		return this.mock.credentials(req.organizationId);
	}

	@Get("certificates")
	@RequirePermissions("eims-certificate:read")
	certificates(@Req() req: AuthedRequest) {
		return this.mock.certificates(req.organizationId);
	}

	@Get("bulk")
	@RequirePermissions("eims-bulk:read")
	bulk(@Req() req: AuthedRequest) {
		return this.mock.bulkBatches(req.organizationId);
	}

	@Get("cancellations")
	@RequirePermissions("invoice:read")
	cancellations(@Req() req: AuthedRequest) {
		return this.mock.cancellations(req.organizationId);
	}

	@Get("buyers")
	@RequirePermissions("invoice:read")
	buyers(@Req() req: AuthedRequest) {
		return this.mock.buyers(req.organizationId);
	}

	@Get("print-layouts")
	@RequirePermissions("invoice:read")
	printLayouts(@Req() req: AuthedRequest) {
		return this.mock.printLayouts(req.organizationId);
	}

	@Get("notifications")
	@RequirePermissions("invoice:read")
	notifications(@Req() req: AuthedRequest) {
		return this.mock.notificationLogs(req.organizationId);
	}

	@Get("branch-health")
	@RequirePermissions("eims-source:read")
	branchHealth(@Req() req: AuthedRequest) {
		return this.mock.branchHealth(req.organizationId);
	}
}

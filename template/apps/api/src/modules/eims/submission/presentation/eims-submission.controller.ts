import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsSubmissionService } from "../application/eims-submission.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSubmissionController {
	constructor(private readonly submissionService: EimsSubmissionService) {}

	@Get("overview")
	@RequirePermissions("eims-submission:read")
	overview(@Req() req: AuthedRequest) {
		return this.submissionService.getOverview(req.organizationId);
	}

	@Get("submissions")
	@RequirePermissions("eims-submission:read")
	submissions(@Req() req: AuthedRequest) {
		return this.submissionService.listSubmissions(req.organizationId);
	}

	@Post("submissions/mock-submit")
	@RequirePermissions("eims-submission:create")
	createMockSubmission(@Req() req: AuthedRequest, @Body() body: { documentNumber?: string }) {
		return this.submissionService.submitInvoice({
			organizationId: req.organizationId,
			documentNumber: body.documentNumber,
		});
	}

	@Get("verify/:irn")
	@RequirePermissions("eims-submission:read")
	verify(@Req() req: AuthedRequest, @Param("irn") irn: string) {
		return this.submissionService.verifyIrn(req.organizationId, irn);
	}
}

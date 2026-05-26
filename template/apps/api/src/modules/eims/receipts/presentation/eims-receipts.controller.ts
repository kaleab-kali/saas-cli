import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsReceiptsService } from "../application/eims-receipts.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims/receipts")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsReceiptsController {
	constructor(private readonly receipts: EimsReceiptsService) {}

	@Get()
	@RequirePermissions("receipt:read")
	list(@Req() req: AuthedRequest) {
		return this.receipts.listReceipts(req.organizationId);
	}

	@Post("mock-submit")
	@RequirePermissions("receipt:submit")
	createMockReceipt(@Req() req: AuthedRequest) {
		return this.receipts.submitReceipt({ organizationId: req.organizationId });
	}
}

import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsTwoFactorPolicyGuard } from "../../shared/security/eims-two-factor-policy.guard";
import { EimsReceiptsService } from "../application/eims-receipts.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims/receipts")
@UseGuards(AuthGuard, EimsTwoFactorPolicyGuard, PermissionsGuard)
export class EimsReceiptsController {
	constructor(private readonly receipts: EimsReceiptsService) {}

	@Get()
	@RequirePermissions("receipt:read")
	list(@Req() req: AuthedRequest) {
		return this.receipts.listReceipts(req.organizationId);
	}

	@Post()
	@RequirePermissions("receipt:submit")
	submitReceipt(
		@Req() req: AuthedRequest,
		@Body()
		body: {
			sourceSystemId?: string;
			receiptNumber?: string;
			receiptType?: string;
			invoiceIrn?: string;
			paymentMode?: string;
			paidAmount?: string;
			withholdingType?: string;
		},
	) {
		return this.receipts.submitReceipt({
			organizationId: req.organizationId,
			sourceSystemId: body.sourceSystemId,
			receiptNumber: body.receiptNumber,
			payload: body,
		});
	}
}

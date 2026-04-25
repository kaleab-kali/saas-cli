import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { ListEmailDeliveriesHandler } from "../../application/queries/list-email-deliveries.handler";

@ApiTags("Notifications — Email Deliveries")
@Controller("notifications/email-deliveries")
@UseGuards(AuthGuard, PermissionsGuard)
export class EmailDeliveryController {
	constructor(private readonly listH: ListEmailDeliveriesHandler) {}

	@Get()
	@RequirePermissions("organization:update")
	async list(
		@Query("status") status: string | undefined,
		@Query("source") source: string | undefined,
		@Query("page") page: string | undefined,
		@Query("limit") limit: string | undefined,
		@Req() req: { organizationId: string },
	) {
		return this.listH.execute(req.organizationId, {
			status,
			source,
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
		});
	}
}

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateBulkHandler } from "../../application/commands/create-bulk/create-bulk.handler";
import { ScheduleBulkHandler } from "../../application/commands/schedule-bulk/schedule-bulk.handler";
import { SendBulkHandler } from "../../application/commands/send-bulk/send-bulk.handler";
import { CreateBulkDto, ScheduleBulkDto } from "../../application/dto/bulk-communication.dto";
import { ListBulkHandler } from "../../application/queries/list-bulk.handler";

@ApiTags("Notifications — Bulk")
@Controller("notifications/bulk")
@UseGuards(AuthGuard, PermissionsGuard)
export class BulkCommunicationController {
	constructor(
		private readonly listH: ListBulkHandler,
		private readonly createH: CreateBulkHandler,
		private readonly scheduleH: ScheduleBulkHandler,
		private readonly sendH: SendBulkHandler,
	) {}

	@Get()
	@RequirePermissions("contact:update")
	async list(@Query("status") status: string | undefined, @Req() req: { organizationId: string }) {
		const data = await this.listH.execute(req.organizationId, { status });
		return { data };
	}

	@Post()
	@RequirePermissions("contact:update")
	@ApiOperation({ summary: "Create draft bulk communication" })
	async create(@Body() dto: CreateBulkDto, @Req() req: { organizationId: string; userId?: string }) {
		const data = await this.createH.execute(req.organizationId, dto, req.userId ?? null);
		return { data };
	}

	@Post(":id/schedule")
	@RequirePermissions("contact:update")
	async schedule(@Param("id") id: string, @Body() dto: ScheduleBulkDto, @Req() req: { organizationId: string }) {
		const data = await this.scheduleH.execute(req.organizationId, id, dto.scheduledAt);
		return { data };
	}

	@Post(":id/send")
	@RequirePermissions("contact:update")
	@ApiOperation({ summary: "Send now" })
	async send(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.sendH.execute(req.organizationId, id);
		return { data };
	}
}

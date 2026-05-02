import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { DeleteTemplateHandler } from "../../application/commands/delete-template/delete-template.handler";
import { UpsertTemplateHandler } from "../../application/commands/upsert-template/upsert-template.handler";
import { UpsertTemplateDto } from "../../application/dto/template.dto";
import { ListTemplatesHandler } from "../../application/queries/list-templates.handler";

@ApiTags("Notifications — Templates")
@Controller("notifications/templates")
@UseGuards(AuthGuard, PermissionsGuard)
export class TemplateController {
	constructor(
		private readonly listH: ListTemplatesHandler,
		private readonly upsertH: UpsertTemplateHandler,
		private readonly deleteH: DeleteTemplateHandler,
	) {}

	@Get()
	@RequirePermissions("notification:manage")
	async list(@Req() req: { organizationId: string }) {
		const data = await this.listH.execute(req.organizationId);
		return { data };
	}

	@Post()
	@RequirePermissions("notification:manage")
	async upsert(@Body() dto: UpsertTemplateDto, @Req() req: { organizationId: string }) {
		const data = await this.upsertH.execute(req.organizationId, dto);
		return { data };
	}

	@Delete(":id")
	@RequirePermissions("notification:manage")
	async remove(@Param("id") id: string, @Req() req: { organizationId: string }) {
		await this.deleteH.execute(req.organizationId, id);
		return { data: { deleted: true } };
	}
}

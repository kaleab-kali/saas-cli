import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import {
	GetSettingsHandler,
	UpdateSettingsHandler,
} from "../../application/commands/update-settings/update-settings.handler";
import { UpdateOrganizationSettingsDto } from "../../application/dto/organization-settings.dto";

@ApiTags("Organization Settings")
@Controller("organization-settings")
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationSettingsController {
	constructor(
		private readonly getHandler: GetSettingsHandler,
		private readonly updateHandler: UpdateSettingsHandler,
	) {}

	@Get()
	@RequirePermissions("organization:read")
	async get(@Req() req: { organizationId: string }) {
		const settings = await this.getHandler.execute(req.organizationId);
		return { data: settings.toPrimitives() };
	}

	@Patch()
	@RequirePermissions("organization:update")
	async update(@Body() dto: UpdateOrganizationSettingsDto, @Req() req: { organizationId: string }) {
		const settings = await this.updateHandler.execute(req.organizationId, dto);
		return { data: settings.toPrimitives() };
	}
}

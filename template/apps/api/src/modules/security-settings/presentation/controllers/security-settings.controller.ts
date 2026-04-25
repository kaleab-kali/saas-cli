import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import {
	GetSecuritySettingsHandler,
	UpdateSecuritySettingsHandler,
} from "../../application/commands/update-security-settings.handler";
import { UpdateSecuritySettingsDto } from "../../application/dto/security-settings.dto";

@ApiTags("Security Settings")
@Controller("security-settings")
@UseGuards(AuthGuard, PermissionsGuard)
export class SecuritySettingsController {
	constructor(
		private readonly getHandler: GetSecuritySettingsHandler,
		private readonly updateHandler: UpdateSecuritySettingsHandler,
	) {}

	@Get()
	@RequirePermissions("security-settings:read")
	async get(@Req() req: { organizationId: string }) {
		const s = await this.getHandler.execute(req.organizationId);
		return { data: s.toPrimitives() };
	}

	@Patch()
	@RequirePermissions("security-settings:update")
	async update(@Body() dto: UpdateSecuritySettingsDto, @Req() req: { organizationId: string }) {
		const s = await this.updateHandler.execute(req.organizationId, dto);
		return { data: s.toPrimitives() };
	}
}

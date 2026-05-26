import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsLookupService } from "./eims-lookup.service";

@Controller("eims/lookups")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsLookupController {
	constructor(private readonly lookups: EimsLookupService) {}

	@Get(":name")
	@RequirePermissions("eims-enterprise:read")
	get(@Param("name") name: string) {
		return this.lookups.get(name);
	}
}

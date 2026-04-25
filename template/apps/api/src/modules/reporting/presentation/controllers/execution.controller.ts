import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { ListExecutionsHandler } from "../../application/queries/list-executions.handler";

@ApiTags("Reporting — Executions")
@Controller("reporting/executions")
@UseGuards(AuthGuard, PermissionsGuard)
export class ExecutionController {
	constructor(private readonly listH: ListExecutionsHandler) {}

	@Get()
	@RequirePermissions("report:read")
	async list(
		@Query("reportId") reportId: string | undefined,
		@Query("limit") limit: string | undefined,
		@Req() req: { organizationId: string },
	) {
		const data = await this.listH.execute(req.organizationId, {
			reportId,
			limit: limit ? Number(limit) : undefined,
		});
		return { data };
	}
}

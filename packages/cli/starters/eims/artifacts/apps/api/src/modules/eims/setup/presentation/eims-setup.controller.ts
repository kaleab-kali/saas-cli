import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateEimsEnterpriseHandler } from "../application/commands/create-enterprise.handler";
import { CreateEimsEstablishmentHandler } from "../application/commands/create-establishment.handler";
import { CreateEimsSourceSystemHandler } from "../application/commands/create-source-system.handler";
import {
	CreateEimsEnterpriseDto,
	CreateEimsEstablishmentDto,
	CreateEimsSourceSystemDto,
} from "../application/dto/eims-setup.dto";
import { ListEimsSetupHandler } from "../application/queries/list-eims-setup.handler";
import { EimsSetupRepository } from "../domain/eims-setup.repository";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims/setup")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSetupController {
	constructor(
		private readonly listSetup: ListEimsSetupHandler,
		private readonly createEnterpriseHandler: CreateEimsEnterpriseHandler,
		private readonly createEstablishmentHandler: CreateEimsEstablishmentHandler,
		private readonly createSourceSystemHandler: CreateEimsSourceSystemHandler,
		private readonly repo: EimsSetupRepository,
	) {}

	@Get()
	@RequirePermissions("eims-enterprise:read")
	async index(@Req() req: AuthedRequest) {
		return { data: await this.listSetup.execute(req.organizationId) };
	}

	@Get("enterprises")
	@RequirePermissions("eims-enterprise:read")
	async enterprises(@Req() req: AuthedRequest) {
		return { data: await this.repo.listEnterprises(req.organizationId) };
	}

	@Post("enterprises")
	@RequirePermissions("eims-enterprise:create")
	async createEnterprise(@Body() dto: CreateEimsEnterpriseDto, @Req() req: AuthedRequest) {
		const enterprise = await this.createEnterpriseHandler.execute(req.organizationId, dto);
		return {
			data: {
				...enterprise,
				message: `Enterprise saved for TIN ${enterprise.tin}`,
			},
		};
	}

	@Get("establishments")
	@RequirePermissions("eims-establishment:read")
	async establishments(@Query("enterpriseId") enterpriseId: string | undefined, @Req() req: AuthedRequest) {
		return {
			data: await this.repo.listEstablishments(req.organizationId, enterpriseId),
		};
	}

	@Post("establishments")
	@RequirePermissions("eims-establishment:create")
	async createEstablishment(@Body() dto: CreateEimsEstablishmentDto, @Req() req: AuthedRequest) {
		const establishment = await this.createEstablishmentHandler.execute(req.organizationId, dto);
		return {
			data: {
				...establishment,
				message: `Branch saved: ${establishment.name}`,
			},
		};
	}

	@Get("sources")
	@RequirePermissions("eims-source:read")
	async sourceSystems(@Query("establishmentId") establishmentId: string | undefined, @Req() req: AuthedRequest) {
		return {
			data: await this.repo.listSourceSystems(req.organizationId, establishmentId),
		};
	}

	@Post("sources")
	@RequirePermissions("eims-source:create")
	async createSourceSystem(@Body() dto: CreateEimsSourceSystemDto, @Req() req: AuthedRequest) {
		const source = await this.createSourceSystemHandler.execute(req.organizationId, dto);
		return {
			data: {
				...source,
				message:
					"Register/POS details saved. Final tax sync remains blocked until connection details and certificate are valid.",
			},
		};
	}
}

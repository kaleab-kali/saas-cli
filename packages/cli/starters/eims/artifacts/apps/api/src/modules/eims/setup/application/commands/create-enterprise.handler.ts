import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsEnterpriseDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsEnterpriseHandler {
	constructor(private readonly repo: EimsSetupRepository) {}

	execute(organizationId: string, dto: CreateEimsEnterpriseDto) {
		return this.repo.createEnterprise(organizationId, dto);
	}
}

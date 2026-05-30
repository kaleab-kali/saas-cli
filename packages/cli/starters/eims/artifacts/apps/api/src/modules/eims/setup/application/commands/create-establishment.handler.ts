import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsEstablishmentDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsEstablishmentHandler {
	constructor(private readonly repo: EimsSetupRepository) {}

	execute(organizationId: string, dto: CreateEimsEstablishmentDto) {
		return this.repo.createEstablishment(organizationId, dto);
	}
}

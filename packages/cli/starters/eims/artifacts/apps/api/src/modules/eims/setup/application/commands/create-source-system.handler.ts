import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsSourceSystemDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsSourceSystemHandler {
	constructor(private readonly repo: EimsSetupRepository) {}

	execute(organizationId: string, dto: CreateEimsSourceSystemDto) {
		return this.repo.createSourceSystem(organizationId, dto);
	}
}

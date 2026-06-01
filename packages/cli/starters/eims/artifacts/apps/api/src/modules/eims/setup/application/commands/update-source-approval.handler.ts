import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { UpdateEimsSourceApprovalDto } from "../dto/eims-setup.dto";

@Injectable()
export class UpdateEimsSourceApprovalHandler {
	constructor(private readonly repo: EimsSetupRepository) {}

	execute(organizationId: string, sourceSystemId: string, dto: UpdateEimsSourceApprovalDto) {
		return this.repo.updateSourceApproval(organizationId, sourceSystemId, dto);
	}
}

import { Inject, Injectable } from "@nestjs/common";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../../shared/mock/eims-backend.repository";

@Injectable()
export class EimsComplianceService {
	constructor(@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository) {}

	generateEvidencePackage(organizationId: string) {
		return this.repository.complianceEvidence(organizationId);
	}
}

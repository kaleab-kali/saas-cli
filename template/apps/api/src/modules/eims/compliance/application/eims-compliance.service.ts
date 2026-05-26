import { Injectable } from "@nestjs/common";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

@Injectable()
export class EimsComplianceService {
	constructor(private readonly fixtures: EimsMockService) {}

	generateEvidencePackage(organizationId: string) {
		return this.fixtures.complianceEvidence(organizationId);
	}
}

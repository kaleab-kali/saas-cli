import { Injectable } from "@nestjs/common";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

@Injectable()
export class EimsAdminService {
	constructor(private readonly fixtures: EimsMockService) {}

	overview() {
		return this.fixtures.adminOverview();
	}

	tenants() {
		return this.fixtures.adminTenants();
	}

	failures() {
		return this.fixtures.adminFailures();
	}

	certificates() {
		return this.fixtures.adminCertificates();
	}

	resources() {
		return this.fixtures.adminResources();
	}

	compliance() {
		return this.fixtures.adminCompliance();
	}
}

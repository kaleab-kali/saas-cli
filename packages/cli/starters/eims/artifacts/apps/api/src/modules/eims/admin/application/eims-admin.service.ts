import { Inject, Injectable } from "@nestjs/common";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../../shared/mock/eims-backend.repository";

@Injectable()
export class EimsAdminService {
	constructor(@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository) {}

	overview() {
		return this.repository.adminOverview();
	}

	tenants() {
		return this.repository.adminTenants();
	}

	failures() {
		return this.repository.adminFailures();
	}

	certificates() {
		return this.repository.adminCertificates();
	}

	resources() {
		return this.repository.adminResources();
	}

	compliance() {
		return this.repository.adminCompliance();
	}

	runAction(action: string, targetId?: string) {
		return this.repository.adminRunAction(action, targetId);
	}
}

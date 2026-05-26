import { Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../../shared/client/eims-external-client";
import { EimsMockService } from "../../shared/mock/eims-mock.service";
import type { EimsSubmissionCommand } from "../domain/eims-submission.types";

@Injectable()
export class EimsSubmissionService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		private readonly fixtures: EimsMockService,
	) {}

	getOverview(organizationId: string) {
		return this.fixtures.tenantOverview(organizationId);
	}

	listSubmissions(organizationId: string) {
		return this.fixtures.submissions(organizationId);
	}

	async submitInvoice(command: EimsSubmissionCommand) {
		return this.client.registerInvoice(command);
	}

	async verifyIrn(organizationId: string, irn: string) {
		return this.client.verifyIrn({ organizationId, irn });
	}
}

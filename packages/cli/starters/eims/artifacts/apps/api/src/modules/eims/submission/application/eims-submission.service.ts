import { Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../../shared/client/eims-external-client";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../../shared/mock/eims-backend.repository";
import { EimsSubmissionQueueService } from "../../shared/queues/eims-submission-queue.service";
import type { EimsSubmissionCommand } from "../domain/eims-submission.types";

@Injectable()
export class EimsSubmissionService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
		private readonly queue: EimsSubmissionQueueService,
	) {}

	getOverview(organizationId: string) {
		return this.repository.tenantOverview(organizationId);
	}

	getWorkspace(organizationId: string) {
		return this.repository.tenantWorkspace(organizationId);
	}

	listSubmissions(organizationId: string) {
		return this.repository.submissions(organizationId);
	}

	async submitInvoice(command: EimsSubmissionCommand) {
		return this.queue.enqueueInvoice(command, (queued) => this.client.registerInvoice(queued));
	}

	async verifyIrn(organizationId: string, irn: string) {
		return this.client.verifyIrn({ organizationId, irn });
	}
}

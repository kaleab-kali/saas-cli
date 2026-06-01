import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../setup/domain/eims-setup.repository";
import { evaluateSourceSubmissionReadiness } from "../../setup/domain/source-submission.guard";
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
		private readonly setupRepository: EimsSetupRepository,
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
		const sourceSystemId = command.sourceSystemId?.trim();
		if (!sourceSystemId) throw new BadRequestException("sourceSystemId is required for EIMS submission");
		const source = await this.setupRepository.getSourceSubmissionReadiness(command.organizationId, sourceSystemId);
		if (!source) throw new BadRequestException("EIMS source system is not registered for this organization");
		const readiness = evaluateSourceSubmissionReadiness(source);
		if (!readiness.ready) {
			throw new ForbiddenException({
				message: "EIMS source system is not ready for submission",
				reasons: readiness.reasons,
			});
		}
		return this.queue.enqueueInvoice({ ...command, sourceSystemId }, (queued) => this.client.registerInvoice(queued));
	}

	async verifyIrn(organizationId: string, irn: string) {
		return this.client.verifyIrn({ organizationId, irn });
	}
}

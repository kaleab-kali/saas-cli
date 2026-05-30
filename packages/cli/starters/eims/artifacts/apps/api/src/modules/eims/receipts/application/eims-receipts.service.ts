import { Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../../shared/client/eims-external-client";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../../shared/mock/eims-backend.repository";

@Injectable()
export class EimsReceiptsService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
	) {}

	listReceipts(organizationId: string) {
		return this.repository.receipts(organizationId);
	}

	submitReceipt(input: { organizationId: string; sourceSystemId?: string; receiptNumber?: string; payload?: unknown }) {
		return this.client.registerReceipt(input);
	}
}

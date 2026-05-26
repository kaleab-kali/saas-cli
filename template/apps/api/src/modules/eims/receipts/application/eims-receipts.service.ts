import { Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../../shared/client/eims-external-client";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

@Injectable()
export class EimsReceiptsService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		private readonly fixtures: EimsMockService,
	) {}

	listReceipts(organizationId: string) {
		return this.fixtures.receipts(organizationId);
	}

	submitReceipt(input: { organizationId: string; sourceSystemId?: string; receiptNumber?: string; payload?: unknown }) {
		return this.client.registerReceipt(input);
	}
}

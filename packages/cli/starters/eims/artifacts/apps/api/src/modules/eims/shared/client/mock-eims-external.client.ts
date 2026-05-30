import { Inject, Injectable } from "@nestjs/common";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../mock/eims-backend.repository";
import type { EimsExternalClient, RegisterInvoiceInput, RegisterReceiptInput } from "./eims-external-client";

@Injectable()
export class MockEimsExternalClient implements EimsExternalClient {
	constructor(@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository) {}

	async registerInvoice(input: RegisterInvoiceInput) {
		return this.repository.createAcceptedSubmission(input.organizationId, input.documentNumber);
	}

	async registerReceipt(input: RegisterReceiptInput) {
		return this.repository.createAcceptedReceipt(input.organizationId, {
			receiptNumber: input.receiptNumber,
			payload: input.payload,
		});
	}

	async verifyIrn(input: { organizationId: string; irn: string }) {
		return {
			data: {
				organizationId: input.organizationId,
				irn: input.irn,
				status: input.irn.startsWith("IRN-") ? "active" : "not_found",
				verifiedAt: new Date().toISOString(),
			},
		};
	}
}

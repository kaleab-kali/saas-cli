import { Injectable } from "@nestjs/common";
import { EimsMockService } from "../mock/eims-mock.service";
import type { EimsExternalClient, RegisterInvoiceInput, RegisterReceiptInput } from "./eims-external-client";

@Injectable()
export class MockEimsExternalClient implements EimsExternalClient {
	constructor(private readonly fixtures: EimsMockService) {}

	async registerInvoice(input: RegisterInvoiceInput) {
		return this.fixtures.createMockSubmission(input.organizationId, input.documentNumber);
	}

	async registerReceipt(input: RegisterReceiptInput) {
		const response = this.fixtures.receipts(input.organizationId);
		return {
			data: {
				...response.data[0],
				receiptNumber: input.receiptNumber ?? response.data[0]?.receiptNumber,
				status: "accepted",
			},
		};
	}

	async verifyIrn(input: { organizationId: string; irn: string }) {
		return {
			data: {
				organizationId: input.organizationId,
				irn: input.irn,
				status: input.irn.startsWith("MOCK-IRN") ? "active" : "not_found",
				verifiedAt: new Date().toISOString(),
			},
		};
	}
}

import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../../shared/client/eims-external-client";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../../shared/mock/eims-backend.repository";

export interface EimsReceiptSubmissionCommand {
	organizationId: string;
	sourceSystemId?: string;
	receiptNumber?: string;
	payload?: unknown;
}

@Injectable()
export class EimsReceiptsService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
	) {}

	listReceipts(organizationId: string) {
		return this.repository.receipts(organizationId);
	}

	async submitReceipt(input: EimsReceiptSubmissionCommand) {
		const receiptNumber = input.receiptNumber?.trim();
		if (!receiptNumber) throw new BadRequestException("Receipt number is required before SDK dispatch");
		const payload = this.recordValue(input.payload);
		if (!this.stringValue(payload.invoiceIrn)) {
			throw new BadRequestException("Receipt invoiceIrn is required before SDK dispatch");
		}

		const response = await this.client.registerReceipt({
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			receiptNumber,
			payload,
		});
		const data = response.data;
		const reference =
			this.stringValue(data.reference) ??
			this.stringValue(data.rrn) ??
			this.stringValue(data.receiptNumber) ??
			receiptNumber;

		return {
			data: {
				message: this.stringValue(data.message) ?? "Receipt submitted through EIMS SDK",
				status: this.stringValue(data.status) ?? "accepted",
				reference,
				sdkResponse: data,
			},
			meta: response.meta,
		};
	}

	private recordValue(value: unknown) {
		return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
	}

	private stringValue(value: unknown) {
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}
}

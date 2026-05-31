import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { type CancelInvoiceInput, EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../client/eims-external-client";

export interface EimsCancellationCommand extends Omit<CancelInvoiceInput, "organizationId"> {
	organizationId: string;
}

@Injectable()
export class EimsCancellationService {
	constructor(@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient) {}

	async cancelInvoice(input: EimsCancellationCommand) {
		const invoiceIrn = input.invoiceIrn?.trim();
		const reasonCode = input.reasonCode?.trim() || "4";
		const remark = input.remark?.trim();
		if (!invoiceIrn) throw new BadRequestException("Invoice tax reference is required for cancellation");
		if (reasonCode === "4" && !remark) {
			throw new UnprocessableEntityException("Reason code 4 requires a remark before cancellation");
		}

		const response = await this.client.cancelInvoice({
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			invoiceIrn,
			reasonCode,
			remark,
			payload: input.payload ?? {
				invoiceIrn,
				reasonCode,
				remark,
			},
		});
		const data = response.data;
		const status = this.stringValue(data.status) ?? this.stringValue(data.Status) ?? "accepted";
		const reference =
			this.stringValue(data.reference) ??
			this.stringValue(data.irn) ??
			this.stringValue(data.Irn) ??
			`${input.organizationId}:${invoiceIrn}`;

		return {
			data: {
				message: this.stringValue(data.message) ?? "Cancellation submitted through EIMS SDK",
				status,
				reference,
				sdkResponse: data,
			},
			meta: response.meta,
		};
	}

	private stringValue(value: unknown) {
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}
}

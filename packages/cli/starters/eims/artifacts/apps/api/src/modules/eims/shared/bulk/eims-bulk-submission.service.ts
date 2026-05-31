import { Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient, type SubmitBulkInput } from "../client/eims-external-client";

export interface EimsBulkSubmissionCommand extends Omit<SubmitBulkInput, "organizationId"> {
	organizationId: string;
}

@Injectable()
export class EimsBulkSubmissionService {
	constructor(@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient) {}

	async submitBatch(input: EimsBulkSubmissionCommand) {
		const invoices = Array.isArray(input.invoices) ? input.invoices : [];
		const response = await this.client.submitBulk({
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			invoices,
			payload: input.payload ?? { invoices },
		});
		const data = response.data;
		const reference =
			this.stringValue(data.reference) ??
			this.stringValue(data.conversationId) ??
			this.stringValue(data.ConversationId) ??
			`bulk:${input.organizationId}`;

		return {
			data: {
				message: this.stringValue(data.message) ?? "Batch sync started through EIMS SDK",
				status: this.stringValue(data.status) ?? this.stringValue(data.Status) ?? "processing",
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

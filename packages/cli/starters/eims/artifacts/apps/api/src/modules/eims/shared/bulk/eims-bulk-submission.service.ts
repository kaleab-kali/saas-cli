import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
	type EimsBulkCallbackDocumentResult,
	type EimsBulkCallbackPayload,
	stableEimsCallbackJson,
	summarizeEimsBulkCallbackPayload,
} from "../callbacks/eims-bulk-callback.service";
import { EimsBulkCallbackPersistenceService } from "../callbacks/eims-bulk-callback-persistence.service";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient, type SubmitBulkInput } from "../client/eims-external-client";

export interface EimsBulkSubmissionCommand extends Omit<SubmitBulkInput, "organizationId"> {
	organizationId: string;
}

@Injectable()
export class EimsBulkSubmissionService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		private readonly receipts: EimsBulkCallbackPersistenceService,
	) {}

	async submitBatch(input: EimsBulkSubmissionCommand) {
		const invoices = Array.isArray(input.invoices) ? input.invoices : [];
		const response = await this.client.submitBulk({
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			invoices,
			payload: input.payload ?? { invoices },
		});
		const data = response.data;
		const sdkReference =
			this.stringValue(data.reference) ??
			this.stringValue(data.conversationId) ??
			this.stringValue(data.ConversationId);
		const reference = sdkReference ?? `bulk:${input.organizationId}`;
		const receipt = sdkReference ? await this.storePendingConversation(input, invoices, sdkReference) : null;

		return {
			data: {
				message: this.stringValue(data.message) ?? "Batch sync started through EIMS SDK",
				status: this.stringValue(data.status) ?? this.stringValue(data.Status) ?? "processing",
				reference,
				receipt,
				sdkResponse: data,
			},
			meta: response.meta,
		};
	}

	private async storePendingConversation(
		input: EimsBulkSubmissionCommand,
		invoices: unknown[],
		conversationId: string,
	) {
		const payload: EimsBulkCallbackPayload = {
			organizationId: input.organizationId,
			conversationId,
			callbackId: `submitted:${conversationId}`,
			results: this.pendingResults(conversationId, invoices),
		};
		const idempotencyKey = `submitted:${conversationId}:${this.sha256(stableEimsCallbackJson(payload))}`;
		const summary = summarizeEimsBulkCallbackPayload(payload, idempotencyKey, new Date(), "submitted");
		return this.receipts.storeSubmittedBatch({ payload, summary });
	}

	private pendingResults(conversationId: string, invoices: unknown[]): EimsBulkCallbackDocumentResult[] {
		const rows = invoices.length > 0 ? invoices : [{ documentNumber: `${conversationId}-PENDING-001` }];
		return rows.map((invoice, index) => ({
			documentNumber: this.documentNumber(invoice) ?? `${conversationId}-DOC-${String(index + 1).padStart(3, "0")}`,
			status: "pending",
		}));
	}

	private documentNumber(invoice: unknown) {
		const record = invoice && typeof invoice === "object" ? (invoice as Record<string, unknown>) : {};
		return (
			this.stringValue(record.documentNumber) ??
			this.stringValue(record.documentNo) ??
			this.stringValue(record.invoiceNumber) ??
			this.stringValue(record.reference)
		);
	}

	private stringValue(value: unknown) {
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}
}

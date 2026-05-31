import { createHash } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT, type EimsExternalClient } from "../client/eims-external-client";
import {
	type EimsBulkCallbackDocumentResult,
	type EimsBulkCallbackPayload,
	stableEimsCallbackJson,
	summarizeEimsBulkCallbackPayload,
} from "./eims-bulk-callback.service";
import { EimsBulkCallbackPersistenceService } from "./eims-bulk-callback-persistence.service";

const ACCEPTED_STATUSES = new Set(["accepted", "success", "succeeded", "registered", "completed", "complete"]);
const FAILED_STATUSES = new Set(["failed", "failure", "rejected", "error", "errored"]);

export interface EimsBulkReconciliationPollingInput {
	organizationId: string;
	conversationId?: string;
	sourceSystemId?: string;
	now?: Date;
}

@Injectable()
export class EimsBulkReconciliationPollingService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		private readonly receipts: EimsBulkCallbackPersistenceService,
	) {}

	async pollConversation(input: EimsBulkReconciliationPollingInput) {
		const conversationId = input.conversationId?.trim();
		if (!conversationId) throw new BadRequestException("Bulk conversationId is required for SDK status polling");

		const response = await this.client.pollBulkStatus({
			organizationId: input.organizationId,
			conversationId,
			sourceSystemId: input.sourceSystemId,
		});
		const payload = this.toCallbackPayload(input.organizationId, conversationId, response.data);
		const idempotencyKey = `poll:${conversationId}:${this.sha256(stableEimsCallbackJson(payload))}`;
		const summary = summarizeEimsBulkCallbackPayload(payload, idempotencyKey, input.now ?? new Date(), "polled");
		const receipt = await this.receipts.storePolledReconciliation({ payload, summary });

		return {
			data: {
				message: "Batch status refreshed through EIMS SDK polling",
				status: receipt.reconciliationStatus,
				reference: receipt.conversationId,
				receipt,
				sdkMeta: response.meta,
			},
		};
	}

	private toCallbackPayload(
		organizationId: string,
		conversationId: string,
		data: Record<string, unknown>,
	): EimsBulkCallbackPayload {
		const results = this.resultsFromData(conversationId, data);
		return {
			organizationId: this.stringValue(data.organizationId) ?? organizationId,
			conversationId: this.stringValue(data.conversationId) ?? conversationId,
			callbackId: this.stringValue(data.callbackId) ?? `poll:${conversationId}`,
			results: results.length > 0 ? results : this.resultsFromCounts(conversationId, data),
		};
	}

	private resultsFromData(conversationId: string, data: Record<string, unknown>): EimsBulkCallbackDocumentResult[] {
		const rows = Array.isArray(data.results)
			? data.results
			: Array.isArray(data.documents)
				? data.documents
				: Array.isArray(data.items)
					? data.items
					: [];

		return rows.map((row, index) => this.resultFromRow(conversationId, row, index));
	}

	private resultFromRow(conversationId: string, row: unknown, index: number): EimsBulkCallbackDocumentResult {
		const record = this.recordValue(row);
		const documentNumber =
			this.stringValue(record.documentNumber) ??
			this.stringValue(record.documentNo) ??
			this.stringValue(record.invoiceNumber) ??
			this.stringValue(record.reference) ??
			`${conversationId}-DOC-${String(index + 1).padStart(3, "0")}`;

		return {
			documentNumber,
			status: this.normalizedStatus(record.status ?? record.state ?? record.result),
			irn: this.stringValue(record.irn) ?? this.stringValue(record.ackNumber) ?? null,
			errorCode: this.stringValue(record.errorCode) ?? this.stringValue(record.code) ?? null,
			errorMessage: this.stringValue(record.errorMessage) ?? this.stringValue(record.message) ?? null,
		};
	}

	private resultsFromCounts(conversationId: string, data: Record<string, unknown>): EimsBulkCallbackDocumentResult[] {
		const accepted = this.countValue(data.accepted);
		const failed = this.countValue(data.failed);
		const pending = this.countValue(data.pending);
		const submitted = Math.max(this.countValue(data.submitted), accepted + failed + pending);
		const inferredPending = Math.max(0, submitted - accepted - failed - pending);
		const pendingCount = pending + inferredPending;

		const results = [
			...this.syntheticResults(conversationId, "accepted", accepted),
			...this.syntheticResults(conversationId, "failed", failed),
			...this.syntheticResults(conversationId, "pending", pendingCount),
		];

		return results.length > 0
			? results
			: [
					{
						documentNumber: `${conversationId}-STATUS-001`,
						status: this.normalizedStatus(data.status),
					},
				];
	}

	private syntheticResults(
		conversationId: string,
		status: EimsBulkCallbackDocumentResult["status"],
		count: number,
	): EimsBulkCallbackDocumentResult[] {
		return Array.from({ length: count }, (_, index) => ({
			documentNumber: `${conversationId}-${status.toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
			status,
			errorCode: status === "failed" ? "SDK_BULK_STATUS_FAILED" : null,
			errorMessage: status === "failed" ? "SDK bulk status reported a failed document" : null,
		}));
	}

	private normalizedStatus(value: unknown): EimsBulkCallbackDocumentResult["status"] {
		const status = String(value ?? "pending")
			.trim()
			.toLowerCase();
		if (ACCEPTED_STATUSES.has(status)) return "accepted";
		if (FAILED_STATUSES.has(status)) return "failed";
		return "pending";
	}

	private countValue(value: unknown) {
		const count = Number(value ?? 0);
		return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
	}

	private stringValue(value: unknown) {
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}

	private recordValue(value: unknown) {
		return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}
}

import { Inject, Injectable } from "@nestjs/common";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../mock/eims-backend.repository";
import type {
	EimsExternalClient,
	PollBulkStatusInput,
	RegisterInvoiceInput,
	RegisterReceiptInput,
	ValidateCredentialInput,
} from "./eims-external-client";

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

	async pollBulkStatus(input: PollBulkStatusInput) {
		const batch = this.repository
			.bulkBatches(input.organizationId)
			.data.find(
				(row) => String((row as { conversationId?: unknown }).conversationId ?? "") === input.conversationId,
			) as
			| {
					conversationId?: string;
					status?: string;
					submitted?: number;
					accepted?: number;
					failed?: number;
					pending?: number;
			  }
			| undefined;

		const accepted = Math.max(0, Number(batch?.accepted ?? 1));
		const failed = Math.max(0, Number(batch?.failed ?? 0));
		const pending = Math.max(0, Number(batch?.pending ?? 0));
		const submittedCount = Number(batch?.submitted ?? accepted + failed + pending);
		const submitted = Number.isFinite(submittedCount)
			? Math.max(accepted + failed + pending, submittedCount)
			: accepted + failed + pending;
		const conversationId = batch?.conversationId ?? input.conversationId;

		return {
			data: {
				organizationId: input.organizationId,
				conversationId,
				message: "Batch status refreshed through mock EIMS connector",
				reference: conversationId,
				status: pending > 0 ? "processing" : failed > 0 ? "attention" : "accepted",
				submitted,
				accepted,
				failed,
				pending,
				results: [
					...Array.from({ length: accepted }, (_, index) => ({
						documentNumber: `${conversationId}-ACCEPTED-${String(index + 1).padStart(3, "0")}`,
						status: "accepted",
						irn: `IRN-${conversationId}-${index + 1}`,
					})),
					...Array.from({ length: failed }, (_, index) => ({
						documentNumber: `${conversationId}-FAILED-${String(index + 1).padStart(3, "0")}`,
						status: "failed",
						errorCode: "MOCK_RECONCILIATION_FAILURE",
						errorMessage: "Mock bulk result requires operator review",
					})),
					...Array.from({ length: pending }, (_, index) => ({
						documentNumber: `${conversationId}-PENDING-${String(index + 1).padStart(3, "0")}`,
						status: "pending",
					})),
				],
			},
		};
	}

	async validateCredential(input: ValidateCredentialInput) {
		return {
			data: {
				organizationId: input.organizationId,
				sourceSystemId: input.sourceSystemId ?? null,
				environment: input.environment ?? "sandbox",
				status: Object.keys(input.credentials).length > 0 ? "valid" : "invalid",
				valid: Object.keys(input.credentials).length > 0,
				validatedAt: new Date().toISOString(),
			},
		};
	}
}

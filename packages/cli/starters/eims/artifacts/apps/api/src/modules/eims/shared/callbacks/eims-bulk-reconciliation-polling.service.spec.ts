import type { EimsExternalClient } from "../client/eims-external-client";
import type { EimsBulkCallbackPersistenceService } from "./eims-bulk-callback-persistence.service";
import { EimsBulkReconciliationPollingService } from "./eims-bulk-reconciliation-polling.service";

describe("EimsBulkReconciliationPollingService", () => {
	const now = new Date("2026-05-26T10:30:00.000Z");

	const client = (data: Record<string, unknown>): EimsExternalClient =>
		({
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn().mockResolvedValue({ data, meta: { sdkRequestId: "sdk-req-1" } }),
			cancelInvoice: jest.fn(),
		}) as EimsExternalClient;

	const receipts = () =>
		({
			storePolledReconciliation: jest.fn().mockImplementation(({ summary }) => Promise.resolve(summary)),
		}) as unknown as EimsBulkCallbackPersistenceService;

	it("polls bulk status through the EIMS external client and stores a durable reconciliation receipt", async () => {
		const eimsClient = client({
			conversationId: "BATCH-1",
			results: [
				{ documentNumber: "INV-1", status: "registered", irn: "IRN-1" },
				{ documentNumber: "INV-2", status: "rejected", errorCode: "67005", errorMessage: "Invalid sequence" },
				{ documentNumber: "INV-3", status: "pending" },
			],
		});
		const receiptStore = receipts();
		const service = new EimsBulkReconciliationPollingService(eimsClient, receiptStore);

		const response = await service.pollConversation({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			conversationId: "BATCH-1",
			now,
		});

		expect(eimsClient.pollBulkStatus).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			conversationId: "BATCH-1",
		});
		expect(receiptStore.storePolledReconciliation).toHaveBeenCalledWith({
			payload: expect.objectContaining({
				organizationId: "org_1",
				conversationId: "BATCH-1",
				callbackId: "poll:BATCH-1",
				results: [
					expect.objectContaining({ documentNumber: "INV-1", status: "accepted" }),
					expect.objectContaining({ documentNumber: "INV-2", status: "failed" }),
					expect.objectContaining({ documentNumber: "INV-3", status: "pending" }),
				],
			}),
			summary: expect.objectContaining({
				signatureStatus: "polled",
				reconciliationStatus: "attention",
				totals: { submitted: 3, accepted: 1, failed: 1, pending: 1 },
				processedAt: now.toISOString(),
			}),
		});
		expect(response.data).toMatchObject({
			message: "Batch status refreshed through EIMS SDK polling",
			status: "attention",
			reference: "BATCH-1",
		});
	});

	it("normalizes SDK count-only bulk status responses into durable receipt totals", async () => {
		const eimsClient = client({
			status: "processing",
			submitted: 5,
			accepted: 3,
			failed: 1,
		});
		const receiptStore = receipts();
		const service = new EimsBulkReconciliationPollingService(eimsClient, receiptStore);

		await service.pollConversation({ organizationId: "org_1", conversationId: "BATCH-COUNTS", now });

		expect(receiptStore.storePolledReconciliation).toHaveBeenCalledWith(
			expect.objectContaining({
				summary: expect.objectContaining({
					signatureStatus: "polled",
					reconciliationStatus: "attention",
					totals: { submitted: 5, accepted: 3, failed: 1, pending: 1 },
				}),
			}),
		);
	});

	it("fails before SDK polling when conversationId is missing", async () => {
		const service = new EimsBulkReconciliationPollingService(client({}), receipts());

		await expect(service.pollConversation({ organizationId: "org_1" })).rejects.toThrow(
			"Bulk conversationId is required",
		);
	});
});

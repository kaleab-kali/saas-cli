import type { EimsExternalClient } from "../client/eims-external-client";
import { EimsBulkSubmissionService } from "./eims-bulk-submission.service";

describe("EimsBulkSubmissionService", () => {
	const client = (): EimsExternalClient =>
		({
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn().mockResolvedValue({
				data: {
					message: "Batch accepted by SDK",
					status: "processing",
					conversationId: "BATCH-SDK-1",
				},
				meta: { sdkRequestId: "sdk-bulk-1" },
			}),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		}) as EimsExternalClient;

	it("submits bulk invoices through the EIMS external client boundary", async () => {
		const eimsClient = client();
		const service = new EimsBulkSubmissionService(eimsClient);

		const response = await service.submitBatch({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoices: [{ documentNumber: "INV-1" }],
		});

		expect(eimsClient.submitBulk).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoices: [{ documentNumber: "INV-1" }],
			payload: { invoices: [{ documentNumber: "INV-1" }] },
		});
		expect(response).toEqual({
			data: {
				message: "Batch accepted by SDK",
				status: "processing",
				reference: "BATCH-SDK-1",
				sdkResponse: {
					message: "Batch accepted by SDK",
					status: "processing",
					conversationId: "BATCH-SDK-1",
				},
			},
			meta: { sdkRequestId: "sdk-bulk-1" },
		});
	});
});

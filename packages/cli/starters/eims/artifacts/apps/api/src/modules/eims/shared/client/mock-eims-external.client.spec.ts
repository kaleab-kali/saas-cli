import { EimsMockService } from "../mock/eims-mock.service";
import { MockEimsExternalClient } from "./mock-eims-external.client";

describe("MockEimsExternalClient", () => {
	const organizationId = "org_test";

	it("returns accepted invoice responses with tenant-facing IRNs", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		const response = await client.registerInvoice({
			organizationId,
			sourceSystemId: "src_mock_1",
			documentNumber: "INV-TEST-002",
		});

		expect(response).toMatchObject({
			data: expect.objectContaining({
				documentNumber: "INV-TEST-002",
				organizationId,
				status: "accepted",
				irn: expect.stringMatching(/^IRN-/),
			}),
		});
	});

	it("returns accepted receipt responses from the backend test connector", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		const response = await client.registerReceipt({
			organizationId,
			sourceSystemId: "src_mock_1",
			receiptNumber: "RCPT-TEST-001",
		});

		expect(response).toEqual({
			data: expect.objectContaining({
				receiptNumber: "RCPT-TEST-001",
				status: "accepted",
			}),
		});
	});

	it("verifies only tenant-facing IRNs as active", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(client.verifyIrn({ organizationId, irn: "IRN-001" })).resolves.toEqual({
			data: expect.objectContaining({ irn: "IRN-001", status: "active" }),
		});
		await expect(client.verifyIrn({ organizationId, irn: "REAL-IRN-MISSING" })).resolves.toEqual({
			data: expect.objectContaining({ irn: "REAL-IRN-MISSING", status: "not_found" }),
		});
	});

	it("validates mock credentials through the same external client boundary", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(
			client.validateCredential({
				organizationId,
				sourceSystemId: "src_mock_1",
				environment: "sandbox",
				credentials: { apiKey: "mock-key" },
			}),
		).resolves.toEqual({
			data: expect.objectContaining({
				organizationId,
				sourceSystemId: "src_mock_1",
				status: "valid",
				valid: true,
			}),
		});
	});

	it("polls mock bulk status through the same external client boundary", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(
			client.pollBulkStatus({
				organizationId,
				sourceSystemId: "src_mock_1",
				conversationId: "BATCH-20260526-001",
			}),
		).resolves.toEqual({
			data: expect.objectContaining({
				organizationId,
				conversationId: "BATCH-20260526-001",
				status: "processing",
				results: expect.arrayContaining([
					expect.objectContaining({ documentNumber: expect.stringContaining("ACCEPTED"), status: "accepted" }),
					expect.objectContaining({ documentNumber: expect.stringContaining("FAILED"), status: "failed" }),
					expect.objectContaining({ documentNumber: expect.stringContaining("PENDING"), status: "pending" }),
				]),
			}),
		});
	});

	it("submits mock bulk batches through the same external client boundary", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(client.submitBulk({ organizationId, sourceSystemId: "src_mock_1" })).resolves.toEqual({
			data: expect.objectContaining({
				message: "Batch sync started and batch ID stored",
				status: "processing",
				reference: expect.stringMatching(/^BATCH-/),
			}),
		});
	});

	it("cancels invoices through the same external client boundary", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(
			client.cancelInvoice({
				organizationId,
				sourceSystemId: "src_mock_1",
				invoiceIrn: "IRN-001",
				reasonCode: "4",
				remark: "Customer returned the order",
			}),
		).resolves.toEqual({
			data: expect.objectContaining({
				message: "Cancellation submitted with reason and audit event",
				status: "accepted",
				reference: `${organizationId}:IRN-001`,
			}),
		});
	});
});

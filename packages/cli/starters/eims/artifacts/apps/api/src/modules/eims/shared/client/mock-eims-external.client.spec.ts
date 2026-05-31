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
});

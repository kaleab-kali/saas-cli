import { EimsMockService } from "../mock/eims-mock.service";
import { MockEimsExternalClient } from "./mock-eims-external.client";

describe("MockEimsExternalClient", () => {
	const organizationId = "org_test";

	it("returns accepted invoice responses with mock IRNs", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		const response = await client.registerInvoice({
			organizationId,
			sourceSystemId: "src_mock_1",
			documentNumber: "INV-TEST-002",
		});

		expect(response).toEqual({
			data: expect.objectContaining({
				documentNumber: "INV-TEST-002",
				organizationId,
				status: "accepted",
				irn: expect.stringMatching(/^MOCK-IRN-/),
			}),
		});
	});

	it("returns accepted receipt responses from the backend mock", async () => {
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

	it("verifies only mock IRNs as active", async () => {
		const client = new MockEimsExternalClient(new EimsMockService());

		await expect(client.verifyIrn({ organizationId, irn: "MOCK-IRN-001" })).resolves.toEqual({
			data: expect.objectContaining({ irn: "MOCK-IRN-001", status: "active" }),
		});
		await expect(client.verifyIrn({ organizationId, irn: "REAL-IRN-MISSING" })).resolves.toEqual({
			data: expect.objectContaining({ irn: "REAL-IRN-MISSING", status: "not_found" }),
		});
	});
});

import { ServiceUnavailableException } from "@nestjs/common";
import { EimsSdkExternalClient } from "./eims-sdk-external.client";

describe("EimsSdkExternalClient", () => {
	it("delegates invoice registration to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn().mockResolvedValue({ data: { irn: "SDK-IRN-1", status: "accepted" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.registerInvoice({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			counter: 129,
			previousIrn: "IRN-128",
			payload: { DocumentNumber: "INV-1" },
		});

		expect(sdk.registerInvoice).toHaveBeenCalledWith(
			{ DocumentNumber: "INV-1" },
			{
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: 129,
				previousIrn: "IRN-128",
			},
		);
		expect(response.data).toMatchObject({ irn: "SDK-IRN-1", status: "accepted" });
	});

	it("delegates receipt registration to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn().mockResolvedValue({ receiptNumber: "RRN-1" }),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.registerReceipt({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			receiptNumber: "RCPT-1",
			payload: { ReceiptNumber: "RCPT-1" },
		});

		expect(sdk.registerReceipt).toHaveBeenCalledWith(
			{ ReceiptNumber: "RCPT-1" },
			{
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: undefined,
				previousIrn: null,
			},
		);
		expect(response.data).toMatchObject({ sdkResponse: { receiptNumber: "RRN-1" } });
	});

	it("fails closed when production SDK provider is not configured", async () => {
		const client = new EimsSdkExternalClient();

		await expect(client.registerInvoice({ organizationId: "org_1" })).rejects.toBeInstanceOf(
			ServiceUnavailableException,
		);
	});
});

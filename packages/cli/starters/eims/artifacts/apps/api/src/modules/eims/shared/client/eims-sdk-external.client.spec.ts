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

	it("delegates credential validation to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			pollBulkStatus: jest.fn(),
			validateCredential: jest.fn().mockResolvedValue({ data: { status: "valid", valid: true } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.validateCredential({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			environment: "production",
			clientId: "client-front-pos",
			username: "TIN0074136947",
			credentials: { apiKey: "plain-api-key" },
		});

		expect(sdk.validateCredential).toHaveBeenCalledWith({
			credentials: { apiKey: "plain-api-key" },
			environment: "production",
			clientId: "client-front-pos",
			username: "TIN0074136947",
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: undefined,
				previousIrn: null,
			},
		});
		expect(response.data).toMatchObject({ status: "valid", valid: true });
	});

	it("delegates bulk status polling to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			pollBulkStatus: jest.fn().mockResolvedValue({
				data: {
					conversationId: "BATCH-1",
					results: [{ documentNumber: "INV-1", status: "accepted" }],
				},
			}),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.pollBulkStatus({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			conversationId: "BATCH-1",
		});

		expect(sdk.pollBulkStatus).toHaveBeenCalledWith({
			conversationId: "BATCH-1",
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: undefined,
				previousIrn: null,
			},
		});
		expect(response.data).toMatchObject({ conversationId: "BATCH-1" });
	});

	it("delegates bulk submission to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			submitBulk: jest.fn().mockResolvedValue({ data: { conversationId: "BATCH-SDK-1", status: "processing" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.submitBulk({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoices: [{ DocumentNumber: "INV-1" }],
			payload: { invoices: [{ DocumentNumber: "INV-1" }] },
		});

		expect(sdk.submitBulk).toHaveBeenCalledWith({
			invoices: [{ DocumentNumber: "INV-1" }],
			payload: { invoices: [{ DocumentNumber: "INV-1" }] },
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: undefined,
				previousIrn: null,
			},
		});
		expect(response.data).toMatchObject({ conversationId: "BATCH-SDK-1", status: "processing" });
	});

	it("accepts SDK bulk submission aliases while keeping the SaaS adapter stable", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			submitBulkDocuments: jest.fn().mockResolvedValue({ data: { status: "processing" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		await expect(client.submitBulk({ organizationId: "org_1" })).resolves.toEqual({
			data: { status: "processing" },
		});
		expect(sdk.submitBulkDocuments).toHaveBeenCalledWith({
			invoices: [],
			payload: { invoices: [] },
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: undefined,
				counter: undefined,
				previousIrn: null,
			},
		});
	});

	it("accepts SDK bulk polling aliases while keeping the SaaS adapter stable", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			getBulkConversationStatus: jest.fn().mockResolvedValue({ data: { status: "processing" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		await expect(client.pollBulkStatus({ organizationId: "org_1", conversationId: "BATCH-1" })).resolves.toEqual({
			data: { status: "processing" },
		});
		expect(sdk.getBulkConversationStatus).toHaveBeenCalledWith({
			conversationId: "BATCH-1",
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: undefined,
				counter: undefined,
				previousIrn: null,
			},
		});
	});

	it("delegates invoice cancellation to the configured EIMS SDK client", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			cancelInvoice: jest.fn().mockResolvedValue({ data: { status: "accepted", reference: "CANCEL-1" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		const response = await client.cancelInvoice({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoiceIrn: "IRN-1",
			reasonCode: "4",
			remark: "Customer returned the order",
			payload: { Irn: "IRN-1", Reason: "4" },
		});

		expect(sdk.cancelInvoice).toHaveBeenCalledWith({
			irn: "IRN-1",
			reasonCode: "4",
			remark: "Customer returned the order",
			payload: { Irn: "IRN-1", Reason: "4" },
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: "src_front",
				counter: undefined,
				previousIrn: null,
			},
		});
		expect(response.data).toMatchObject({ status: "accepted", reference: "CANCEL-1" });
	});

	it("accepts SDK cancellation aliases while keeping the SaaS adapter stable", async () => {
		const sdk = {
			registerInvoice: jest.fn(),
			submitCancellation: jest.fn().mockResolvedValue({ data: { status: "accepted" } }),
		};
		const client = new EimsSdkExternalClient(sdk);

		await expect(client.cancelInvoice({ organizationId: "org_1", invoiceIrn: "IRN-1" })).resolves.toEqual({
			data: { status: "accepted" },
		});
		expect(sdk.submitCancellation).toHaveBeenCalledWith({
			irn: "IRN-1",
			reasonCode: undefined,
			remark: undefined,
			payload: {},
			tenantConfig: {
				organizationId: "org_1",
				sourceSystemId: undefined,
				counter: undefined,
				previousIrn: null,
			},
		});
	});

	it("fails closed when production SDK provider is not configured", async () => {
		const client = new EimsSdkExternalClient();

		await expect(client.registerInvoice({ organizationId: "org_1" })).rejects.toBeInstanceOf(
			ServiceUnavailableException,
		);
	});
});

import { BadRequestException } from "@nestjs/common";
import type { EimsExternalClient } from "../../shared/client/eims-external-client";
import type { EimsBackendRepository } from "../../shared/mock/eims-backend.repository";
import { EimsReceiptsService } from "./eims-receipts.service";

describe("EimsReceiptsService", () => {
	const repository = (): EimsBackendRepository =>
		({
			receipts: jest.fn().mockReturnValue({ data: [] }),
		}) as unknown as EimsBackendRepository;

	const client = (): EimsExternalClient =>
		({
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn().mockResolvedValue({
				data: {
					message: "Receipt accepted by SDK",
					status: "accepted",
					rrn: "RRN-SDK-1",
					receiptNumber: "RCPT-1",
				},
				meta: { sdkRequestId: "sdk-receipt-1" },
			}),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		}) as EimsExternalClient;

	it("lists receipts from the tenant repository", () => {
		const eimsRepository = repository();
		const service = new EimsReceiptsService(client(), eimsRepository);

		expect(service.listReceipts("org_1")).toEqual({ data: [] });
		expect(eimsRepository.receipts).toHaveBeenCalledWith("org_1");
	});

	it("submits receipts through the EIMS external client boundary", async () => {
		const eimsClient = client();
		const service = new EimsReceiptsService(eimsClient, repository());

		const response = await service.submitReceipt({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			receiptNumber: " RCPT-1 ",
			payload: {
				invoiceIrn: "IRN-1",
				paymentMode: "CASH",
				paidAmount: "517.50",
			},
		});

		expect(eimsClient.registerReceipt).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			receiptNumber: "RCPT-1",
			payload: {
				invoiceIrn: "IRN-1",
				paymentMode: "CASH",
				paidAmount: "517.50",
			},
		});
		expect(response).toEqual({
			data: {
				message: "Receipt accepted by SDK",
				status: "accepted",
				reference: "RRN-SDK-1",
				sdkResponse: {
					message: "Receipt accepted by SDK",
					status: "accepted",
					rrn: "RRN-SDK-1",
					receiptNumber: "RCPT-1",
				},
			},
			meta: { sdkRequestId: "sdk-receipt-1" },
		});
	});

	it("requires a receipt number and linked invoice IRN before SDK dispatch", async () => {
		const eimsClient = client();
		const service = new EimsReceiptsService(eimsClient, repository());

		await expect(
			service.submitReceipt({ organizationId: "org_1", receiptNumber: "", payload: { invoiceIrn: "IRN-1" } }),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service.submitReceipt({ organizationId: "org_1", receiptNumber: "RCPT-1", payload: {} }),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(eimsClient.registerReceipt).not.toHaveBeenCalled();
	});
});

import { UnprocessableEntityException } from "@nestjs/common";
import type { EimsExternalClient } from "../client/eims-external-client";
import { EimsCancellationService } from "./eims-cancellation.service";

describe("EimsCancellationService", () => {
	const client = (): EimsExternalClient =>
		({
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn().mockResolvedValue({
				data: {
					message: "Cancellation accepted by SDK",
					status: "accepted",
					reference: "CANCEL-1",
				},
				meta: { sdkRequestId: "sdk-cancel-1" },
			}),
		}) as EimsExternalClient;

	it("submits invoice cancellations through the EIMS external client boundary", async () => {
		const eimsClient = client();
		const service = new EimsCancellationService(eimsClient);

		const response = await service.cancelInvoice({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoiceIrn: " IRN-1 ",
			reasonCode: "4",
			remark: " Customer returned the order ",
		});

		expect(eimsClient.cancelInvoice).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			invoiceIrn: "IRN-1",
			reasonCode: "4",
			remark: "Customer returned the order",
			payload: {
				invoiceIrn: "IRN-1",
				reasonCode: "4",
				remark: "Customer returned the order",
			},
		});
		expect(response).toEqual({
			data: {
				message: "Cancellation accepted by SDK",
				status: "accepted",
				reference: "CANCEL-1",
				sdkResponse: {
					message: "Cancellation accepted by SDK",
					status: "accepted",
					reference: "CANCEL-1",
				},
			},
			meta: { sdkRequestId: "sdk-cancel-1" },
		});
	});

	it("enforces reason code 4 remarks before calling the SDK", async () => {
		const eimsClient = client();
		const service = new EimsCancellationService(eimsClient);

		await expect(
			service.cancelInvoice({ organizationId: "org_1", invoiceIrn: "IRN-1", reasonCode: "4" }),
		).rejects.toBeInstanceOf(UnprocessableEntityException);
		expect(eimsClient.cancelInvoice).not.toHaveBeenCalled();
	});
});

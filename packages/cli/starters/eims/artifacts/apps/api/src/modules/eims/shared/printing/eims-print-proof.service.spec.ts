import { BadRequestException } from "@nestjs/common";
import { EimsPrintProofService } from "./eims-print-proof.service";

describe("EimsPrintProofService", () => {
	const acceptedInput = {
		organizationId: "org_test",
		layout: "compact" as const,
		documentNumber: "INV-2026-000128",
		documentType: "INV",
		sellerTin: "0074136947",
		buyerTin: null,
		irn: "IRN-51fa3144ae45d2a06873a1e81c59ab74",
		signedQr: "signedQR:IRN-51fa3144ae45d2a06873a1e81c59ab74:signature",
		totalValue: "517.50",
		taxValue: "67.50",
		acceptedAt: "2026-05-26T10:30:00.000Z",
		status: "accepted",
	};

	it("renders a PDF print proof with official QR scan metadata", async () => {
		const service = new EimsPrintProofService();

		const result = await service.generate(acceptedInput);
		const pdf = Buffer.from(result.data.pdfBase64, "base64");

		expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
		expect(result.data).toMatchObject({
			layout: "compact",
			paper: "80mm thermal",
			documentNumber: "INV-2026-000128",
			irn: acceptedInput.irn,
			qrScan: {
				valid: true,
				irn: acceptedInput.irn,
				source: "EIMS accepted signedQR only",
			},
		});
		expect(result.data.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.data.mandatoryFields).toEqual(
			expect.arrayContaining(["IRN", "QR", "seller TIN", "tax value", "total value"]),
		);
	});

	it("blocks official print proof before EIMS acceptance", async () => {
		const service = new EimsPrintProofService();

		await expect(service.generate({ ...acceptedInput, status: "pending_offline" })).rejects.toThrow(
			BadRequestException,
		);
	});

	it("requires the signed QR payload to match the accepted IRN", async () => {
		const service = new EimsPrintProofService();

		await expect(service.generate({ ...acceptedInput, signedQr: "signedQR:DIFFERENT" })).rejects.toThrow(
			"Official QR proof must come from the accepted EIMS signedQR payload",
		);
	});
});

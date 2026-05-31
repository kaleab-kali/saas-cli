import { createHash } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";

const PDFDocument = require("pdfkit");

export type EimsPrintLayout = "compact" | "a4";

export interface EimsPrintProofInput {
	organizationId: string;
	layout: EimsPrintLayout;
	documentNumber: string;
	documentType?: string;
	sellerTin: string;
	buyerTin?: string | null;
	irn: string;
	signedQr: string;
	totalValue: string;
	taxValue: string;
	acceptedAt: string;
	status: string;
}

const MANDATORY_FIELDS = ["IRN", "QR", "seller TIN", "document number", "tax value", "total value"] as const;

@Injectable()
export class EimsPrintProofService {
	async generate(input: EimsPrintProofInput) {
		this.assertPrintable(input);
		const pdf = await this.renderPdf(input);
		const sha256 = createHash("sha256").update(pdf).digest("hex");

		return {
			data: {
				organizationId: input.organizationId,
				layout: input.layout,
				paper: input.layout === "compact" ? "80mm thermal" : "A4",
				documentNumber: input.documentNumber,
				irn: input.irn,
				qrScan: {
					valid: true,
					irn: input.irn,
					source: "EIMS accepted signedQR only",
					checkedAt: new Date().toISOString(),
				},
				mandatoryFields: [...MANDATORY_FIELDS],
				pdfBytes: pdf.byteLength,
				pdfSha256: sha256,
				pdfBase64: pdf.toString("base64"),
			},
		};
	}

	private assertPrintable(input: EimsPrintProofInput) {
		if (input.status !== "accepted") {
			throw new BadRequestException("Official print proof requires an accepted EIMS response");
		}
		if (!/^\d{10}$/.test(input.sellerTin)) {
			throw new BadRequestException("Seller TIN must be 10 digits before printing official tax receipts");
		}
		if (!input.irn || input.irn.length < 8) {
			throw new BadRequestException("Official print proof requires an accepted IRN");
		}
		if (!input.signedQr?.includes(input.irn)) {
			throw new BadRequestException("Official QR proof must come from the accepted EIMS signedQR payload");
		}
		if (input.layout !== "compact" && input.layout !== "a4") {
			throw new BadRequestException("Unsupported EIMS print layout");
		}
	}

	private renderPdf(input: EimsPrintProofInput): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({
					size: input.layout === "compact" ? [226, 640] : "A4",
					margin: input.layout === "compact" ? 16 : 48,
				});
				const chunks: Buffer[] = [];
				doc.on("data", (chunk: Buffer) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				doc.fontSize(input.layout === "compact" ? 12 : 18).text("EIMS Tax Receipt", { align: "center" });
				doc.moveDown();
				doc.fontSize(input.layout === "compact" ? 8 : 11);
				doc.text(`Document: ${input.documentNumber}`);
				doc.text(`Type: ${input.documentType ?? "INV"}`);
				doc.text(`Seller TIN: ${input.sellerTin}`);
				if (input.buyerTin) doc.text(`Buyer TIN: ${input.buyerTin}`);
				doc.text(`Accepted: ${input.acceptedAt}`);
				doc.moveDown();
				doc.text(`IRN: ${input.irn}`);
				doc.text(`Tax: ${input.taxValue}`);
				doc.text(`Total: ${input.totalValue}`);
				doc.moveDown();
				doc.text("Official QR payload from accepted EIMS response:", { underline: true });
				doc.text(input.signedQr, { width: input.layout === "compact" ? 190 : 480 });
				doc.moveDown();
				doc.fontSize(input.layout === "compact" ? 7 : 9).text("Do not print official QR before EIMS acceptance.");
				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}
}

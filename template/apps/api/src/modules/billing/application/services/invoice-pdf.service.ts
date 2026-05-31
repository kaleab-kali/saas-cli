import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { minorToDecimalString } from "#shared/i18n/money.util";
import { formatDateInTimeZone } from "#shared/i18n/time-zone.util";
import type { SubscriptionInvoice } from "../../domain/entities/subscription-invoice.entity";

interface CompanyInfo {
	name: string;
	address: string;
	phone: string;
	email: string;
	taxId: string;
}

interface CustomerInfo {
	organizationName: string;
	taxId?: string;
	address?: string;
}

/**
 * Generic invoice PDF generator. Replace defaults via PlatformSettings:
 *   billing.issuerName, billing.issuerAddress, billing.issuerPhone, billing.issuerEmail, billing.issuerTaxId
 */
const DEFAULT_ISSUER: CompanyInfo = {
	name: "Your Company",
	address: "",
	phone: "",
	email: "",
	taxId: "",
};

@Injectable()
export class InvoicePdfService {
	/**
	 * Generate a PDF buffer for the given invoice. Uses generic line-item formatting,
	 * computed `taxMinor` from the invoice itself (org tax rate already applied).
	 */
	async generate(
		invoice: SubscriptionInvoice,
		customer: CustomerInfo,
		issuer: CompanyInfo = DEFAULT_ISSUER,
	): Promise<Buffer> {
		const p = invoice.toPrimitives();
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({ size: "A4", margin: 50 });
				const chunks: Buffer[] = [];
				doc.on("data", (c) => chunks.push(c as Buffer));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				doc.fontSize(20).text(`Invoice ${p.number}`, { align: "right" });
				doc.moveDown();

				doc.fontSize(10).text(issuer.name);
				if (issuer.address) doc.text(issuer.address);
				if (issuer.phone) doc.text(`Phone: ${issuer.phone}`);
				if (issuer.email) doc.text(`Email: ${issuer.email}`);
				if (issuer.taxId) doc.text(`Tax ID: ${issuer.taxId}`);
				doc.moveDown();

				doc.text(`Bill to: ${customer.organizationName}`);
				if (customer.taxId) doc.text(`Tax ID: ${customer.taxId}`);
				if (customer.address) doc.text(customer.address);
				doc.moveDown();

				doc.text(`Issue date: ${formatDateInTimeZone(p.issueDate)}`);
				doc.text(`Due date:   ${formatDateInTimeZone(p.dueDate)}`);
				doc.moveDown();

				doc.fontSize(11).text(p.description ?? "Subscription", { underline: true });
				doc.moveDown(0.5);
				doc.fontSize(10);
				doc.text(`Subtotal:  ${p.currency} ${minorToDecimalString(p.subtotalMinor)}`);
				doc.text(`Tax:       ${p.currency} ${minorToDecimalString(p.taxMinor)}`);
				doc.text(`Total:     ${p.currency} ${minorToDecimalString(p.totalMinor)}`, { underline: true });
				doc.text(`Paid:      ${p.currency} ${minorToDecimalString(p.amountPaidMinor)}`);
				doc.text(`Balance:   ${p.currency} ${minorToDecimalString(p.totalMinor - p.amountPaidMinor)}`);

				doc.end();
			} catch (e) {
				reject(e);
			}
		});
	}
}

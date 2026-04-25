import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type { SubscriptionInvoice } from "../../domain/entities/subscription-invoice.entity";
import { VAT_RATE } from "../../domain/value-objects/feature-keys.vo";

interface CompanyInfo {
	name: string;
	address: string;
	phone: string;
	email: string;
	tin: string;
}

interface CustomerInfo {
	organizationName: string;
	tin?: string;
	address?: string;
}

const PF_ISSUER: CompanyInfo = {
	name: "PropFlow Technologies PLC",
	address: "Bole, Addis Ababa, Ethiopia",
	phone: "+251 911 000 000",
	email: "billing@propflow.et",
	tin: "0000000000",
};

@Injectable()
export class VatInvoiceService {
	/**
	 * Ethiopian VAT-compliant invoice PDF.
	 * Required elements: TIN of issuer + customer, invoice number, VAT rate, VAT amount, sub-total, total, issue date.
	 */
	async generate(invoice: SubscriptionInvoice, customer: CustomerInfo): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const doc = new PDFDocument({ size: "A4", margin: 50 });
			const chunks: Buffer[] = [];
			doc.on("data", (c) => chunks.push(c));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			const p = invoice.toPrimitives();

			// Header
			doc.fontSize(20).font("Helvetica-Bold").text("ኢንቮይስ / VAT INVOICE", { align: "center" });
			doc.moveDown(0.5);

			// Issuer block
			doc.fontSize(10).font("Helvetica-Bold").text(PF_ISSUER.name);
			doc.font("Helvetica");
			doc.text(PF_ISSUER.address);
			doc.text(`Tel: ${PF_ISSUER.phone}  Email: ${PF_ISSUER.email}`);
			doc.text(`TIN: ${PF_ISSUER.tin}`);

			doc.moveDown(0.5);
			doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
			doc.moveDown(0.5);

			// Invoice meta (right-aligned box)
			const _metaY = doc.y;
			doc.font("Helvetica-Bold").text(`Invoice No: ${p.number}`, { align: "left" });
			doc.font("Helvetica").text(`Issue Date: ${p.issueDate.toLocaleDateString("en-GB")}`);
			doc.text(`Due Date: ${p.dueDate.toLocaleDateString("en-GB")}`);
			doc.text(`Period: ${p.periodStart.toLocaleDateString("en-GB")} — ${p.periodEnd.toLocaleDateString("en-GB")}`);
			doc.text(`Currency: ${p.currency}`);
			doc.moveDown(0.5);

			// Bill to
			doc.font("Helvetica-Bold").text("Bill To:");
			doc.font("Helvetica").text(customer.organizationName);
			if (customer.address) doc.text(customer.address);
			if (customer.tin) doc.text(`TIN: ${customer.tin}`);
			doc.moveDown();

			// Line items table
			const tableTop = doc.y;
			const colX = { desc: 50, qty: 340, unit: 400, amount: 480 };
			doc.font("Helvetica-Bold");
			doc.text("Description", colX.desc, tableTop);
			doc.text("Qty", colX.qty, tableTop, { width: 50, align: "right" });
			doc.text("Rate", colX.unit, tableTop, { width: 70, align: "right" });
			doc.text("Amount", colX.amount, tableTop, { width: 60, align: "right" });
			doc
				.moveTo(50, tableTop + 15)
				.lineTo(545, tableTop + 15)
				.stroke();

			doc.font("Helvetica");
			const rowY = tableTop + 22;
			const desc =
				p.description ??
				`Subscription ${p.lineType} (${p.periodStart.toLocaleDateString("en-GB")} — ${p.periodEnd.toLocaleDateString("en-GB")})`;
			doc.text(desc, colX.desc, rowY, { width: 280 });
			doc.text("1", colX.qty, rowY, { width: 50, align: "right" });
			doc.text(p.subtotal.toFixed(2), colX.unit, rowY, { width: 70, align: "right" });
			doc.text(p.subtotal.toFixed(2), colX.amount, rowY, { width: 60, align: "right" });

			doc
				.moveTo(50, rowY + 40)
				.lineTo(545, rowY + 40)
				.stroke();
			doc.moveDown();

			// Totals
			doc.font("Helvetica");
			const totalsX = 400;
			let totalsY = rowY + 50;
			const line = (label: string, val: string, bold = false) => {
				if (bold) doc.font("Helvetica-Bold");
				else doc.font("Helvetica");
				doc.text(label, totalsX, totalsY, { width: 80, align: "left" });
				doc.text(val, totalsX + 80, totalsY, { width: 60, align: "right" });
				totalsY += 18;
			};
			line("Subtotal:", `${p.currency} ${p.subtotal.toFixed(2)}`);
			line(`VAT (${(VAT_RATE * 100).toFixed(0)}%):`, `${p.currency} ${p.vatAmount.toFixed(2)}`);
			line("Total:", `${p.currency} ${p.total.toFixed(2)}`, true);
			line("Paid:", `${p.currency} ${p.amountPaid.toFixed(2)}`);
			line("Balance:", `${p.currency} ${(p.total - p.amountPaid).toFixed(2)}`, true);

			// Payment instructions
			doc
				.font("Helvetica")
				.fontSize(9)
				.text("\n\nPayment Methods:", 50, totalsY + 20);
			doc.text("• Chapa online: pay via the invoice link emailed to you");
			doc.text("• Manual bank transfer to: Commercial Bank of Ethiopia, Acc: 1000-xxxx-xxxx");
			doc.text("• Cash/Telebirr in office — obtain physical receipt");
			doc.moveDown();
			doc
				.fontSize(8)
				.fillColor("grey")
				.text("This is a VAT-compliant invoice issued under Ethiopian tax law. Keep for your records.", {
					align: "center",
				});

			doc.end();
		});
	}
}

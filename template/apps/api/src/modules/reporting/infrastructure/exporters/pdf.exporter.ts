import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

@Injectable()
export class PdfExporter {
	build(title: string, headers: string[], rows: Record<string, unknown>[]): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
			const chunks: Buffer[] = [];
			doc.on("data", (c) => chunks.push(c));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			doc.fontSize(16).text(title, { align: "left" });
			doc.moveDown(0.5);
			doc.fontSize(8).text(`Generated ${new Date().toLocaleString()}`, { align: "left" });
			doc.moveDown();

			const colCount = headers.length;
			const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
			const colWidth = pageWidth / colCount;
			const startX = doc.page.margins.left;
			let y = doc.y;

			doc.fontSize(9).font("Helvetica-Bold");
			for (let i = 0; i < headers.length; i++) {
				doc.text(headers[i], startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
			}
			y = doc.y + 4;
			doc
				.moveTo(startX, y)
				.lineTo(startX + pageWidth, y)
				.stroke();
			y += 4;
			doc.font("Helvetica").fontSize(8);

			for (const row of rows) {
				if (y > doc.page.height - doc.page.margins.bottom - 20) {
					doc.addPage();
					y = doc.page.margins.top;
				}
				for (let i = 0; i < headers.length; i++) {
					const val = row[headers[i]];
					const s = val == null ? "" : String(val);
					doc.text(s, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
				}
				y += 14;
			}

			doc.end();
		});
	}
}

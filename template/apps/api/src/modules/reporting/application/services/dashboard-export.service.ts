import { Injectable } from "@nestjs/common";
import { formatDateTimeInTimeZone } from "#shared/i18n/time-zone.util";
import type { ExportFormat } from "../../domain/value-objects/report.vo";
import { CsvExporter } from "../../infrastructure/exporters/csv.exporter";
import { PdfExporter } from "../../infrastructure/exporters/pdf.exporter";
import { XlsxExporter } from "../../infrastructure/exporters/xlsx.exporter";
import { DashboardService } from "./dashboard.service";

// CommonJS requires - default imports fail at runtime for these packages.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require("exceljs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit");

type Section = { title: string; headers: string[]; rows: Record<string, unknown>[] };
type DashboardKind = "main";

const kvSection = (title: string, obj: Record<string, unknown>): Section => ({
	title,
	headers: ["Metric", "Value"],
	rows: Object.entries(obj).map(([k, v]) => ({ Metric: k, Value: v })),
});

@Injectable()
export class DashboardExportService {
	constructor(
		private readonly dashboards: DashboardService,
		private readonly csv: CsvExporter,
		private readonly xlsx: XlsxExporter,
		readonly _pdf: PdfExporter,
	) {}

	async export(
		kind: DashboardKind,
		format: ExportFormat,
		organizationId: string,
	): Promise<{ buffer: Buffer; filename: string; mime: string }> {
		const sections = await this.buildSections(kind, organizationId);
		const stamp = new Date().toISOString().slice(0, 10);
		const base = `dashboard-${kind}-${stamp}`;

		if (format === "csv") {
			const parts: string[] = [];
			for (const section of sections) {
				parts.push(`# ${section.title}`);
				const buf = this.csv.build(section.headers, section.rows);
				parts.push(buf.toString("utf-8").replace(/^\uFEFF/, ""));
				parts.push("");
			}
			return {
				buffer: Buffer.from(`\uFEFF${parts.join("\n")}`, "utf-8"),
				filename: `${base}.csv`,
				mime: "text/csv",
			};
		}

		if (format === "xlsx") {
			const buffer = await this.buildMultiSheetXlsx(sections);
			return {
				buffer,
				filename: `${base}.xlsx`,
				mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			};
		}

		const buffer = await this.buildPdf(`Dashboard - ${kind.toUpperCase()}`, sections);
		return { buffer, filename: `${base}.pdf`, mime: "application/pdf" };
	}

	private async buildSections(kind: DashboardKind, organizationId: string): Promise<Section[]> {
		if (kind === "main") {
			const dashboard = await this.dashboards.main(organizationId);
			return [kvSection("KPIs", dashboard.kpis as unknown as Record<string, unknown>)];
		}
		return [];
	}

	private async buildMultiSheetXlsx(sections: Section[]): Promise<Buffer> {
		const wb = new ExcelJS.Workbook();
		wb.creator = process.env.APP_NAME ?? "SaaS Platform";
		wb.created = new Date();
		for (const section of sections) {
			const nameSafe = section.title.replace(/[\\/*?[\]:]/g, "_").slice(0, 30);
			const ws = wb.addWorksheet(nameSafe || "Sheet");
			ws.columns = section.headers.map((h) => ({ header: h, key: h, width: Math.max(14, h.length + 2) }));
			ws.getRow(1).font = { bold: true };
			for (const row of section.rows) ws.addRow(row);
			if (section.headers.length > 0 && section.rows.length > 0) {
				ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: section.headers.length } };
			}
		}
		const buf = await wb.xlsx.writeBuffer();
		return Buffer.from(buf);
	}

	private buildPdf(title: string, sections: Section[]): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
			const chunks: Buffer[] = [];
			doc.on("data", (chunk: Buffer) => chunks.push(chunk));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			doc.fontSize(18).text(title, { align: "left" });
			doc.moveDown(0.3);
			doc.fontSize(8).text(`Generated ${formatDateTimeInTimeZone(Date.now())}`, { align: "left" });
			doc.moveDown();

			for (const section of sections) {
				if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
				doc.fontSize(13).font("Helvetica-Bold").text(section.title);
				doc.moveDown(0.3);
				const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
				const colW = pageWidth / Math.max(1, section.headers.length);
				const startX = doc.page.margins.left;
				let y = doc.y;
				doc.fontSize(9).font("Helvetica-Bold");
				for (let i = 0; i < section.headers.length; i += 1) {
					doc.text(section.headers[i], startX + i * colW, y, { width: colW - 4, ellipsis: true });
				}
				y = doc.y + 2;
				doc
					.moveTo(startX, y)
					.lineTo(startX + pageWidth, y)
					.stroke();
				y += 4;
				doc.font("Helvetica").fontSize(8);
				for (const row of section.rows) {
					if (y > doc.page.height - doc.page.margins.bottom - 20) {
						doc.addPage();
						y = doc.page.margins.top;
					}
					for (let i = 0; i < section.headers.length; i += 1) {
						const value = row[section.headers[i]];
						const str = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
						doc.text(str, startX + i * colW, y, { width: colW - 4, ellipsis: true });
					}
					y += 13;
				}
				doc.y = y + 8;
				doc.moveDown(0.5);
			}
			doc.end();
		});
	}
}

import { Injectable } from "@nestjs/common";
import type { ExportFormat } from "../../domain/value-objects/report.vo";
import { CsvExporter } from "../../infrastructure/exporters/csv.exporter";
import { PdfExporter } from "../../infrastructure/exporters/pdf.exporter";
import { XlsxExporter } from "../../infrastructure/exporters/xlsx.exporter";
import { DashboardService } from "./dashboard.service";

// CommonJS requires — default imports fail at runtime for these packages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require("exceljs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit");

type Section = { title: string; headers: string[]; rows: Record<string, unknown>[] };

const kvSection = (title: string, obj: Record<string, unknown>): Section => ({
	title,
	headers: ["Metric", "Value"],
	rows: Object.entries(obj).map(([k, v]) => ({ Metric: k, Value: v as unknown })),
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
		kind: "main" | "property" | "financial" | "crm" | "maintenance",
		format: ExportFormat,
		organizationId: string,
		opts: { buildingId?: string; from?: Date; to?: Date },
	): Promise<{ buffer: Buffer; filename: string; mime: string }> {
		const sections = await this.buildSections(kind, organizationId, opts);
		const stamp = new Date().toISOString().slice(0, 10);
		const base = `dashboard-${kind}-${stamp}`;

		if (format === "csv") {
			const parts: string[] = [];
			for (const s of sections) {
				parts.push(`# ${s.title}`);
				const buf = this.csv.build(s.headers, s.rows);
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
		// pdf: one doc w/ multiple sections
		const buffer = await this.buildPdf(`Dashboard — ${kind.toUpperCase()}`, sections);
		return { buffer, filename: `${base}.pdf`, mime: "application/pdf" };
	}

	private async buildSections(
		kind: "main" | "property" | "financial" | "crm" | "maintenance",
		organizationId: string,
		opts: { buildingId?: string; from?: Date; to?: Date },
	): Promise<Section[]> {
		if (kind === "main") {
			const d = await this.dashboards.main(organizationId);
			return [
				kvSection("KPIs", d.kpis as unknown as Record<string, unknown>),
				{
					title: "Recent Activities",
					headers: ["type", "description", "contact", "createdAt"],
					rows: d.recentActivities as unknown as Record<string, unknown>[],
				},
				{
					title: "Upcoming Viewings",
					headers: ["title", "at"],
					rows: d.upcomingEvents as unknown as Record<string, unknown>[],
				},
				{
					title: "Recent Payments",
					headers: ["amount", "paymentDate", "method"],
					rows: d.recentPayments as unknown as Record<string, unknown>[],
				},
				{
					title: "Recent Work Orders",
					headers: ["title", "status", "priority", "createdAt"],
					rows: d.recentWorkOrders as unknown as Record<string, unknown>[],
				},
				{
					title: "Upcoming Lease Ends",
					headers: ["unit", "endDate", "rentAmount"],
					rows: d.upcomingLeaseEnds as unknown as Record<string, unknown>[],
				},
			];
		}
		if (kind === "property") {
			const d = await this.dashboards.property(organizationId, opts.buildingId);
			return [
				kvSection("Totals", d.totals as unknown as Record<string, unknown>),
				{
					title: "Buildings",
					headers: [
						"name",
						"type",
						"city",
						"totalArea",
						"unitCount",
						"occupiedUnits",
						"occupancyRate",
						"openWorkOrders",
					],
					rows: d.buildings as unknown as Record<string, unknown>[],
				},
				{
					title: "Unit Types",
					headers: ["type", "count"],
					rows: d.unitTypes as unknown as Record<string, unknown>[],
				},
				{
					title: "Vacant Units",
					headers: ["identifier", "type", "askingRent"],
					rows: d.vacantUnits as unknown as Record<string, unknown>[],
				},
			];
		}
		if (kind === "financial") {
			const now = new Date();
			const f = opts.from ?? new Date(now.getFullYear(), 0, 1);
			const t = opts.to ?? now;
			const d = await this.dashboards.financial(organizationId, f, t);
			return [
				kvSection("Summary", {
					periodStart: d.periodStart,
					periodEnd: d.periodEnd,
					revenue: d.revenue,
					expenses: d.expenses,
					netIncome: d.netIncome,
					profitMargin: d.profitMargin,
					outstandingAR: d.outstandingAR,
					collectionRate: d.collectionRate,
					paymentCount: d.paymentCount,
					avgPayment: d.avgPayment,
				}),
				{
					title: "AR Aging",
					headers: ["bucket", "amount"],
					rows: d.aging as unknown as Record<string, unknown>[],
				},
				{
					title: "Revenue Trend",
					headers: ["month", "amount"],
					rows: d.revenueTrend as unknown as Record<string, unknown>[],
				},
				{
					title: "Payments By Method",
					headers: ["method", "count", "amount"],
					rows: d.paymentsByMethod as unknown as Record<string, unknown>[],
				},
				{
					title: "Overdue Invoices",
					headers: ["number", "outstanding", "dueDate", "daysOverdue"],
					rows: d.overdueInvoices as unknown as Record<string, unknown>[],
				},
				{
					title: "Budgets",
					headers: ["category", "annualAmount", "buildingId"],
					rows: d.budgets as unknown as Record<string, unknown>[],
				},
			];
		}
		if (kind === "crm") {
			const d = await this.dashboards.crm(organizationId);
			return [
				kvSection("KPIs", d.kpis as unknown as Record<string, unknown>),
				{
					title: "Pipeline",
					headers: ["stageName", "order", "probability", "count", "value"],
					rows: d.pipeline as unknown as Record<string, unknown>[],
				},
				{
					title: "Leads By Source",
					headers: ["source", "count"],
					rows: d.leadsBySource as unknown as Record<string, unknown>[],
				},
				{
					title: "Leads By Temperature",
					headers: ["temperature", "count"],
					rows: d.leadsByTemperature as unknown as Record<string, unknown>[],
				},
				{
					title: "Deals By Status",
					headers: ["status", "count", "value"],
					rows: d.dealsByStatus as unknown as Record<string, unknown>[],
				},
				{
					title: "Listings By Status",
					headers: ["status", "count"],
					rows: d.listingsByStatus as unknown as Record<string, unknown>[],
				},
				{
					title: "Offers By Status",
					headers: ["status", "count", "amount"],
					rows: d.offersByStatus as unknown as Record<string, unknown>[],
				},
				{
					title: "Recent Won Deals",
					headers: ["title", "value", "actualCloseDate"],
					rows: d.recentWon as unknown as Record<string, unknown>[],
				},
				{
					title: "Recent Lost Deals",
					headers: ["title", "value", "actualCloseDate", "wonLostReason"],
					rows: d.recentLost as unknown as Record<string, unknown>[],
				},
			];
		}
		// maintenance
		const now = new Date();
		const f = opts.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
		const t = opts.to ?? now;
		const d = await this.dashboards.maintenance(organizationId, f, t);
		return [
			kvSection("KPIs", d.kpis as unknown as Record<string, unknown>),
			{ title: "By Status", headers: ["status", "count"], rows: d.byStatus as unknown as Record<string, unknown>[] },
			{
				title: "By Priority",
				headers: ["priority", "count"],
				rows: d.byPriority as unknown as Record<string, unknown>[],
			},
			{
				title: "By Category",
				headers: ["category", "count"],
				rows: d.byCategory as unknown as Record<string, unknown>[],
			},
			{
				title: "By Building",
				headers: ["buildingName", "count"],
				rows: d.byBuilding as unknown as Record<string, unknown>[],
			},
			{
				title: "Top Vendors",
				headers: ["name", "status", "avgRating", "reviewCount", "avgResponseMinutes"],
				rows: d.topVendors as unknown as Record<string, unknown>[],
			},
			{
				title: "Open WO Aging",
				headers: ["title", "priority", "createdAt", "ageDays"],
				rows: d.openWorkOrdersAging as unknown as Record<string, unknown>[],
			},
		];
	}

	private async buildMultiSheetXlsx(sections: Section[]): Promise<Buffer> {
		const wb = new ExcelJS.Workbook();
		wb.creator = "PropFlow";
		wb.created = new Date();
		for (const s of sections) {
			const nameSafe = s.title.replace(/[\\/*?[\]:]/g, "_").slice(0, 30);
			const ws = wb.addWorksheet(nameSafe || "Sheet");
			ws.columns = s.headers.map((h) => ({ header: h, key: h, width: Math.max(14, h.length + 2) }));
			ws.getRow(1).font = { bold: true };
			for (const r of s.rows) ws.addRow(r);
			if (s.headers.length > 0 && s.rows.length > 0) {
				ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.headers.length } };
			}
		}
		const buf = await wb.xlsx.writeBuffer();
		return Buffer.from(buf);
	}

	private buildPdf(title: string, sections: Section[]): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
			const chunks: Buffer[] = [];
			doc.on("data", (c: Buffer) => chunks.push(c));
			doc.on("end", () => resolve(Buffer.concat(chunks)));
			doc.on("error", reject);

			doc.fontSize(18).text(title, { align: "left" });
			doc.moveDown(0.3);
			doc.fontSize(8).text(`Generated ${new Date().toLocaleString()}`, { align: "left" });
			doc.moveDown();

			for (const s of sections) {
				if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
				doc.fontSize(13).font("Helvetica-Bold").text(s.title);
				doc.moveDown(0.3);
				const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
				const colW = pageWidth / Math.max(1, s.headers.length);
				const startX = doc.page.margins.left;
				let y = doc.y;
				doc.fontSize(9).font("Helvetica-Bold");
				for (let i = 0; i < s.headers.length; i++) {
					doc.text(s.headers[i], startX + i * colW, y, { width: colW - 4, ellipsis: true });
				}
				y = doc.y + 2;
				doc
					.moveTo(startX, y)
					.lineTo(startX + pageWidth, y)
					.stroke();
				y += 4;
				doc.font("Helvetica").fontSize(8);
				for (const row of s.rows) {
					if (y > doc.page.height - doc.page.margins.bottom - 20) {
						doc.addPage();
						y = doc.page.margins.top;
					}
					for (let i = 0; i < s.headers.length; i++) {
						const v = row[s.headers[i]];
						const str = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
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

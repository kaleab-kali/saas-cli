import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";

@Injectable()
export class XlsxExporter {
	async build(name: string, headers: string[], rows: Record<string, unknown>[]): Promise<Buffer> {
		const wb = new ExcelJS.Workbook();
		wb.creator = process.env.APP_NAME ?? "SaaS Platform";
		wb.created = new Date();
		const ws = wb.addWorksheet(name.slice(0, 30));
		ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));
		ws.getRow(1).font = { bold: true };
		for (const r of rows) ws.addRow(r);
		ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
		const buf = await wb.xlsx.writeBuffer();
		return Buffer.from(buf);
	}
}

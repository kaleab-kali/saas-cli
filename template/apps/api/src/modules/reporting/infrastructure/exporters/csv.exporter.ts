import { Injectable } from "@nestjs/common";

const esc = (v: unknown): string => {
	if (v == null) return "";
	const s = String(v);
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
};

@Injectable()
export class CsvExporter {
	build(headers: string[], rows: Record<string, unknown>[]): Buffer {
		const lines = [headers.join(",")];
		for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
		return Buffer.from(`\uFEFF${lines.join("\n")}`, "utf-8");
	}
}

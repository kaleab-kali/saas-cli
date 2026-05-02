import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { SavedReport } from "../../domain/entities/saved-report.entity";
import type { DataSource, ReportFilter } from "../../domain/value-objects/report.vo";

const MODEL_MAP: Record<DataSource, string> = {
	property: "building",
	unit: "unit",
	lease: "lease",
	invoice: "invoice",
	payment: "payment",
	work_order: "workOrder",
	deal: "deal",
	listing: "listing",
	contact: "contact",
	purchase_order: "purchaseOrder",
	journal: "journalEntry",
};

@Injectable()
export class ReportExecutorService {
	constructor(private readonly prisma: PrismaService) {}

	private buildWhere(organizationId: string, filters: ReportFilter[]): Record<string, unknown> {
		const where: Record<string, unknown> = { organizationId };
		for (const f of filters) {
			switch (f.operator) {
				case "eq":
					where[f.field] = f.value;
					break;
				case "ne":
					where[f.field] = { not: f.value };
					break;
				case "gt":
					where[f.field] = { gt: f.value };
					break;
				case "gte":
					where[f.field] = { gte: f.value };
					break;
				case "lt":
					where[f.field] = { lt: f.value };
					break;
				case "lte":
					where[f.field] = { lte: f.value };
					break;
				case "in":
					where[f.field] = { in: Array.isArray(f.value) ? f.value : [f.value] };
					break;
				case "contains":
					where[f.field] = { contains: String(f.value), mode: "insensitive" };
					break;
				case "between":
					if (Array.isArray(f.value) && f.value.length === 2) {
						where[f.field] = { gte: f.value[0], lte: f.value[1] };
					}
					break;
				case "is_null":
					where[f.field] = null;
					break;
				case "is_not_null":
					where[f.field] = { not: null };
					break;
				default:
					throw new BadRequestException(`Unknown operator ${f.operator}`);
			}
		}
		return where;
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: generic report executor w/ aggregation dispatch
	async execute(
		organizationId: string,
		report: SavedReport,
	): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
		const p = report.toPrimitives();
		const modelKey = MODEL_MAP[p.dataSource];
		if (!modelKey) throw new BadRequestException(`Unsupported dataSource ${p.dataSource}`);
		const model = (this.prisma as unknown as Record<string, { findMany: Function }>)[modelKey];
		if (!model?.findMany) throw new BadRequestException(`Model ${modelKey} not available`);
		const where = this.buildWhere(organizationId, p.filters);
		const orderBy = p.sort.map((s) => ({ [s.field]: s.dir }));
		const rawRows: Record<string, unknown>[] = await model.findMany({
			where,
			take: 10000,
			...(orderBy.length ? { orderBy } : {}),
		});

		// group/aggregate client-side
		if (p.groupBy.length > 0) {
			const groups = new Map<string, Record<string, unknown>>();
			for (const r of rawRows) {
				const key = p.groupBy.map((g) => String(r[g] ?? "")).join("||");
				if (!groups.has(key)) {
					const init: Record<string, unknown> = {};
					for (const g of p.groupBy) init[g] = r[g];
					for (const c of p.columns) {
						if (c.agg === "count") init[c.field] = 0;
						else if (c.agg) init[c.field] = 0;
						else if (!p.groupBy.includes(c.field)) init[c.field] = r[c.field];
					}
					init.__count = 0;
					groups.set(key, init);
				}
				const g = groups.get(key)!;
				g.__count = (g.__count as number) + 1;
				for (const c of p.columns) {
					if (!c.agg) continue;
					const v = Number(r[c.field] ?? 0);
					if (c.agg === "sum") g[c.field] = ((g[c.field] as number) ?? 0) + v;
					else if (c.agg === "count") g[c.field] = ((g[c.field] as number) ?? 0) + 1;
					else if (c.agg === "min")
						g[c.field] = g[c.field] === 0 || g[c.field] == null ? v : Math.min(g[c.field] as number, v);
					else if (c.agg === "max") g[c.field] = Math.max((g[c.field] as number) ?? Number.NEGATIVE_INFINITY, v);
					else if (c.agg === "avg") {
						const count = g.__count as number;
						const prev = (g[c.field] as number) ?? 0;
						g[c.field] = (prev * (count - 1) + v) / count;
					}
				}
			}
			const headers = [...p.groupBy, ...p.columns.filter((c) => !p.groupBy.includes(c.field)).map((c) => c.field)];
			const rows = Array.from(groups.values()).map((g) => {
				const out: Record<string, unknown> = {};
				for (const h of headers) out[h] = g[h];
				return out;
			});
			return { headers, rows };
		}

		const headers = p.columns.map((c) => c.field);
		const rows = rawRows.map((r) => {
			const out: Record<string, unknown> = {};
			for (const h of headers) out[h] = r[h];
			return out;
		});
		return { headers, rows };
	}
}

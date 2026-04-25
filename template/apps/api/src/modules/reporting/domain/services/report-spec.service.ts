import { BadRequestException, Injectable } from "@nestjs/common";
import type { SavedReport } from "../entities/saved-report.entity";

/**
 * Validates that column fields + filter fields + groupBy fields are allowed
 * for the given dataSource. Data-model-neutral (no Prisma here).
 */

const ALLOWED_FIELDS: Record<string, string[]> = {
	property: ["id", "name", "address", "type", "status", "totalArea", "yearBuilt", "createdAt"],
	unit: ["id", "identifier", "type", "status", "area", "bedrooms", "bathrooms", "askingRent", "buildingId"],
	lease: ["id", "type", "status", "startDate", "endDate", "rentAmount", "currency", "unitId"],
	invoice: ["id", "number", "status", "issueDate", "dueDate", "totalAmount", "paidAmount"],
	payment: ["id", "amount", "method", "paymentDate", "reversed", "referenceNumber"],
	work_order: ["id", "title", "category", "priority", "status", "totalCost", "createdAt", "completedAt"],
	deal: ["id", "title", "value", "probability", "status", "stageId", "expectedCloseDate"],
	listing: ["id", "title", "type", "status", "price", "views", "daysOnMarket"],
	contact: ["id", "firstName", "lastName", "company", "source", "createdAt"],
	purchase_order: ["id", "number", "status", "totalAmount", "deliveryDate"],
	journal: ["id", "date", "description", "source", "status", "totalDebit", "totalCredit"],
};

@Injectable()
export class ReportSpecService {
	assertValid(report: SavedReport): void {
		const p = report.toPrimitives();
		const allowed = ALLOWED_FIELDS[p.dataSource] ?? [];
		const check = (field: string) => {
			if (!allowed.includes(field)) {
				throw new BadRequestException(`Field "${field}" not allowed for dataSource "${p.dataSource}"`);
			}
		};
		for (const c of p.columns) check(c.field);
		for (const f of p.filters) check(f.field);
		for (const g of p.groupBy) check(g);
		for (const s of p.sort) check(s.field);
	}

	allowedFields(dataSource: string): string[] {
		return ALLOWED_FIELDS[dataSource] ?? [];
	}
}

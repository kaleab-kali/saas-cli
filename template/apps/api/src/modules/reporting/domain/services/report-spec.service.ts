import { BadRequestException, Injectable } from "@nestjs/common";
import type { SavedReport } from "../entities/saved-report.entity";

/**
 * Validates that column / filter / groupBy fields are allowed for the given dataSource.
 * Data-model-neutral (no Prisma here). Generic skeleton sources below — extend per-app
 * when you add domain models.
 */
const ALLOWED_FIELDS: Record<string, string[]> = {
	user: ["id", "name", "email", "emailVerified", "createdAt"],
	member: ["id", "userId", "organizationId", "role", "createdAt", "removedAt"],
	audit_log: ["id", "action", "resource", "userId", "userEmail", "status", "ipAddress", "createdAt"],
	notification: ["id", "category", "severity", "title", "read", "userId", "createdAt"],
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

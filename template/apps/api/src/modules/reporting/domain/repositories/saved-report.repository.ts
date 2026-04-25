import type { SavedReport } from "../entities/saved-report.entity";

export abstract class SavedReportRepository {
	abstract findById(organizationId: string, id: string): Promise<SavedReport | null>;
	abstract list(organizationId: string, q?: { dataSource?: string; isTemplate?: boolean }): Promise<SavedReport[]>;
	abstract save(report: SavedReport): Promise<SavedReport>;
	abstract update(organizationId: string, id: string, report: SavedReport): Promise<SavedReport>;
	abstract delete(organizationId: string, id: string): Promise<void>;
}

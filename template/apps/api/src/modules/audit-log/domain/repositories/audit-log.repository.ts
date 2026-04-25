import type { AuditLog, AuditLogProps } from "../entities/audit-log.entity";

export interface AuditLogQuery {
	action?: string;
	resource?: string;
	userId?: string;
	status?: string;
	from?: Date;
	to?: Date;
	skip?: number;
	take?: number;
}

export abstract class AuditLogRepository {
	abstract save(props: Omit<AuditLogProps, "id" | "createdAt">): Promise<AuditLog>;
	abstract list(organizationId: string, q: AuditLogQuery): Promise<{ rows: AuditLog[]; total: number }>;
}

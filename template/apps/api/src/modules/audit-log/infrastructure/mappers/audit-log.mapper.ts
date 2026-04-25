import type { AuditLog as PrismaAuditLog } from "../../../../generated/prisma/client";
import { AuditLog } from "../../domain/entities/audit-log.entity";

export class AuditLogMapper {
	static toDomain(row: PrismaAuditLog): AuditLog {
		return AuditLog.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			userId: row.userId,
			userEmail: row.userEmail,
			action: row.action,
			resource: row.resource,
			resourceId: row.resourceId,
			correlationId: row.correlationId,
			ipAddress: row.ipAddress,
			userAgent: row.userAgent,
			metadata: row.metadata,
			status: row.status,
			errorMessage: row.errorMessage,
			createdAt: row.createdAt,
		});
	}

	static toDto(entity: AuditLog) {
		return entity.toPrimitives();
	}
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { AuditLog, type AuditLogProps } from "../../domain/entities/audit-log.entity";
import { type AuditLogQuery, AuditLogRepository } from "../../domain/repositories/audit-log.repository";
import { AuditLogMapper } from "../mappers/audit-log.mapper";

@Injectable()
export class PrismaAuditLogRepository extends AuditLogRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(props: Omit<AuditLogProps, "id" | "createdAt">): Promise<AuditLog> {
		const row = await this.prisma.auditLog.create({
			data: {
				organizationId: props.organizationId,
				userId: props.userId,
				userEmail: props.userEmail,
				action: props.action,
				resource: props.resource,
				resourceId: props.resourceId,
				correlationId: props.correlationId,
				ipAddress: props.ipAddress,
				userAgent: props.userAgent,
				metadata: (props.metadata as never) ?? undefined,
				status: props.status,
				errorMessage: props.errorMessage,
			},
		});
		return AuditLogMapper.toDomain(row);
	}

	async list(organizationId: string, q: AuditLogQuery) {
		const where = {
			organizationId,
			...(q.action ? { action: q.action } : {}),
			...(q.resource ? { resource: q.resource } : {}),
			...(q.userId ? { userId: q.userId } : {}),
			...(q.status ? { status: q.status } : {}),
			...(q.from || q.to
				? {
						createdAt: {
							...(q.from ? { gte: q.from } : {}),
							...(q.to ? { lte: q.to } : {}),
						},
					}
				: {}),
		};
		const [rows, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: q.skip ?? 0,
				take: Math.min(q.take ?? 50, 500),
			}),
			this.prisma.auditLog.count({ where }),
		]);
		return { rows: rows.map(AuditLogMapper.toDomain), total };
	}
}

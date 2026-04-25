import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";

export interface AuditLogEntry {
	id: string;
	action: string;
	performedBy: string;
	targetType: string;
	targetId: string;
	details: unknown;
	ipAddress: string | null;
	createdAt: Date;
}

interface AuditLogFilters {
	page?: number;
	limit?: number;
	action?: string;
	targetType?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

@Injectable()
export class ListPlatformAuditLogsHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
		const page = params.page || DEFAULT_PAGE;
		const limit = params.limit || DEFAULT_LIMIT;
		const skip = (page - 1) * limit;

		const where: Record<string, unknown> = {};
		if (params.action) where.action = params.action;
		if (params.targetType) where.targetType = params.targetType;

		const [logs, total] = await Promise.all([
			this.prisma.platformAuditLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			this.prisma.platformAuditLog.count({ where }),
		]);

		return {
			data: logs,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
		};
	}
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";
import type { Prisma } from "../../../../generated/prisma/client";

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
	page?: number | string;
	limit?: number | string;
	search?: string;
	sort?: string;
	action?: string;
	targetType?: string;
	performedBy?: string;
	targetId?: string;
	from?: string;
	to?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 5000;

const parsePositiveInt = (value: number | string | undefined, fallback: number) => {
	const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
	return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : fallback;
};

const parseDate = (value: string | undefined) => {
	if (!value) return undefined;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const auditLogSort = (sort: string | undefined): Prisma.PlatformAuditLogOrderByWithRelationInput => {
	const [field, direction] = (sort ?? "createdAt:desc").split(":");
	const dir = direction === "asc" ? "asc" : "desc";
	switch (field) {
		case "action":
		case "performedBy":
		case "targetType":
		case "targetId":
		case "ipAddress":
		case "createdAt":
			return { [field]: dir };
		default:
			return { createdAt: "desc" };
	}
};

@Injectable()
export class ListPlatformAuditLogsHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
		const page = parsePositiveInt(params.page, DEFAULT_PAGE);
		const limit = parsePositiveInt(params.limit, DEFAULT_LIMIT);
		const skip = (page - 1) * limit;

		const where: Prisma.PlatformAuditLogWhereInput = {};
		if (params.action) where.action = params.action;
		if (params.targetType) where.targetType = params.targetType;
		if (params.performedBy) where.performedBy = { contains: params.performedBy, mode: "insensitive" };
		if (params.targetId) where.targetId = { contains: params.targetId, mode: "insensitive" };
		const from = parseDate(params.from);
		const to = parseDate(params.to);
		if (from || to) {
			where.createdAt = {
				...(from ? { gte: from } : {}),
				...(to ? { lte: to } : {}),
			};
		}
		const search = params.search?.trim();
		if (search) {
			where.OR = [
				{ action: { contains: search, mode: "insensitive" } },
				{ performedBy: { contains: search, mode: "insensitive" } },
				{ targetType: { contains: search, mode: "insensitive" } },
				{ targetId: { contains: search, mode: "insensitive" } },
				{ ipAddress: { contains: search, mode: "insensitive" } },
			];
		}

		const [logs, total] = await Promise.all([
			this.prisma.platformAuditLog.findMany({
				where,
				orderBy: auditLogSort(params.sort),
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

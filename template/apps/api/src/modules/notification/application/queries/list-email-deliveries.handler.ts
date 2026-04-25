import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

@Injectable()
export class ListEmailDeliveriesHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(organizationId: string, q: { status?: string; source?: string; page?: number; limit?: number } = {}) {
		const page = Math.max(1, q.page ?? 1);
		const limit = Math.min(200, q.limit ?? 50);
		const where = {
			organizationId,
			...(q.status ? { status: q.status } : {}),
			...(q.source ? { source: q.source } : {}),
		};
		const [total, rows] = await Promise.all([
			this.prisma.emailDelivery.count({ where }),
			this.prisma.emailDelivery.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
		]);
		return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
	}
}

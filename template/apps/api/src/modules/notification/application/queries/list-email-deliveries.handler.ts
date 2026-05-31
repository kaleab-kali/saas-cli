import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";

interface EmailDeliveryFilters {
	status?: string;
	source?: string;
	page?: number;
	limit?: number;
	search?: string;
	sort?: string;
}

const emailDeliverySort = (sort: string | undefined): Prisma.EmailDeliveryOrderByWithRelationInput => {
	const [field, direction] = (sort ?? "createdAt:desc").split(":");
	const dir = direction === "asc" ? "asc" : "desc";
	switch (field) {
		case "toEmail":
		case "subject":
		case "source":
		case "status":
		case "createdAt":
		case "sentAt":
			return { [field]: dir };
		default:
			return { createdAt: "desc" };
	}
};

@Injectable()
export class ListEmailDeliveriesHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(organizationId: string, q: EmailDeliveryFilters = {}) {
		const page = Math.max(1, q.page ?? 1);
		const limit = Math.min(200, q.limit ?? 50);
		const where: Prisma.EmailDeliveryWhereInput = {
			organizationId,
			...(q.status ? { status: q.status } : {}),
			...(q.source ? { source: q.source } : {}),
		};
		const search = q.search?.trim();
		if (search) {
			where.OR = [
				{ toEmail: { contains: search, mode: "insensitive" } },
				{ subject: { contains: search, mode: "insensitive" } },
				{ source: { contains: search, mode: "insensitive" } },
				{ sourceRef: { contains: search, mode: "insensitive" } },
				{ messageId: { contains: search, mode: "insensitive" } },
				{ error: { contains: search, mode: "insensitive" } },
			];
		}
		const [total, rows] = await Promise.all([
			this.prisma.emailDelivery.count({ where }),
			this.prisma.emailDelivery.findMany({
				where,
				orderBy: emailDeliverySort(q.sort),
				skip: (page - 1) * limit,
				take: limit,
			}),
		]);
		return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
	}
}

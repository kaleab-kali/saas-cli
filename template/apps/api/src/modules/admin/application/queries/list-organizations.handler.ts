import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";

export interface OrgListItem {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	createdAt: Date;
	memberCount: number;
	ownerEmail: string | null;
}

interface OrgFilters {
	page?: number;
	limit?: number;
	search?: string;
	sortOrder?: "asc" | "desc";
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ListOrganizationsHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: OrgFilters): Promise<PaginatedResponse<OrgListItem>> {
		const page = params.page || DEFAULT_PAGE;
		const limit = params.limit || DEFAULT_LIMIT;
		const skip = (page - 1) * limit;

		const where = params.search
			? {
					OR: [
						{ name: { contains: params.search, mode: "insensitive" as const } },
						{ slug: { contains: params.search, mode: "insensitive" as const } },
					],
				}
			: {};

		const [organizations, total] = await Promise.all([
			this.prisma.organization.findMany({
				where,
				select: {
					id: true,
					name: true,
					slug: true,
					logo: true,
					createdAt: true,
					_count: { select: { members: true } },
					members: {
						where: { role: { contains: "owner" } },
						select: { user: { select: { email: true } } },
						take: 1,
					},
				},
				orderBy: { createdAt: params.sortOrder === "asc" ? "asc" : "desc" },
				skip,
				take: limit,
			}),
			this.prisma.organization.count({ where }),
		]);

		return {
			data: organizations.map((org) => ({
				id: org.id,
				name: org.name,
				slug: org.slug,
				logo: org.logo,
				createdAt: org.createdAt,
				memberCount: org._count.members,
				ownerEmail: org.members[0]?.user?.email || null,
			})),
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
		};
	}
}

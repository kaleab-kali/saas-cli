import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";
import type { Prisma } from "../../../../generated/prisma/client";

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
	page?: number | string;
	limit?: number | string;
	search?: string;
	sort?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePositiveInt = (value: number | string | undefined, fallback: number) => {
	const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
	return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : fallback;
};

const organizationSort = (sort: string | undefined): Prisma.OrganizationOrderByWithRelationInput => {
	const [field, direction] = (sort ?? "createdAt:desc").split(":");
	const dir = direction === "asc" ? "asc" : "desc";
	switch (field) {
		case "name":
		case "slug":
		case "createdAt":
			return { [field]: dir };
		default:
			return { createdAt: "desc" };
	}
};

@Injectable()
export class ListOrganizationsHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: OrgFilters): Promise<PaginatedResponse<OrgListItem>> {
		const page = parsePositiveInt(params.page, DEFAULT_PAGE);
		const limit = parsePositiveInt(params.limit, DEFAULT_LIMIT);
		const skip = (page - 1) * limit;

		const where: Prisma.OrganizationWhereInput = {};
		const search = params.search?.trim();
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ slug: { contains: search, mode: "insensitive" } },
				{ members: { some: { user: { email: { contains: search, mode: "insensitive" } } } } },
			];
		}

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
				orderBy: organizationSort(params.sort),
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

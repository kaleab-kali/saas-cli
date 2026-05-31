import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";
import type { Prisma } from "../../../../generated/prisma/client";

export interface PlatformUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: Date;
	organizations: { id: string; name: string; role: string }[];
}

interface UserFilters {
	page?: number | string;
	limit?: number | string;
	search?: string;
	sort?: string;
	verified?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const parsePositiveInt = (value: number | string | undefined, fallback: number) => {
	const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
	return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : fallback;
};

const parseBooleanFilter = (value: string | undefined) => {
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
};

const userSort = (sort: string | undefined): Prisma.UserOrderByWithRelationInput => {
	const [field, direction] = (sort ?? "createdAt:desc").split(":");
	const dir = direction === "asc" ? "asc" : "desc";
	switch (field) {
		case "name":
		case "email":
		case "emailVerified":
		case "createdAt":
			return { [field]: dir };
		default:
			return { createdAt: "desc" };
	}
};

@Injectable()
export class ListUsersHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: UserFilters): Promise<PaginatedResponse<PlatformUser>> {
		const page = parsePositiveInt(params.page, DEFAULT_PAGE);
		const limit = parsePositiveInt(params.limit, DEFAULT_LIMIT);
		const skip = (page - 1) * limit;

		const where: Prisma.UserWhereInput = {};
		const search = params.search?.trim();
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
				{ members: { some: { organization: { name: { contains: search, mode: "insensitive" } } } } },
			];
		}
		const verified = parseBooleanFilter(params.verified);
		if (verified !== undefined) where.emailVerified = verified;

		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				select: {
					id: true,
					name: true,
					email: true,
					emailVerified: true,
					createdAt: true,
					members: {
						select: {
							role: true,
							organization: { select: { id: true, name: true } },
						},
					},
				},
				orderBy: userSort(params.sort),
				skip,
				take: limit,
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			data: users.map((u) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				emailVerified: u.emailVerified,
				createdAt: u.createdAt,
				organizations: u.members.map((m) => ({
					id: m.organization.id,
					name: m.organization.name,
					role: m.role,
				})),
			})),
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
		};
	}
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { PaginatedResponse } from "#shared/types";

export interface PlatformUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: Date;
	organizations: { id: string; name: string; role: string }[];
}

interface UserFilters {
	page?: number;
	limit?: number;
	search?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

@Injectable()
export class ListUsersHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: UserFilters): Promise<PaginatedResponse<PlatformUser>> {
		const page = params.page || DEFAULT_PAGE;
		const limit = params.limit || DEFAULT_LIMIT;
		const skip = (page - 1) * limit;

		const where = params.search
			? {
					OR: [
						{ name: { contains: params.search, mode: "insensitive" as const } },
						{ email: { contains: params.search, mode: "insensitive" as const } },
					],
				}
			: {};

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
				orderBy: { createdAt: "desc" },
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

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Plan } from "../../domain/entities/plan.entity";
import { PlanRepository } from "../../domain/repositories/plan.repository";
import { PlanMapper } from "../mappers/plan.mapper";

@Injectable()
export class PrismaPlanRepository extends PlanRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findAll(): Promise<Plan[]> {
		const rows = await this.prisma.plan.findMany({
			where: { active: true },
			orderBy: { sortOrder: "asc" },
			include: { entitlements: true },
		});
		return rows.map(PlanMapper.toDomain);
	}

	async findBySlug(slug: string): Promise<Plan | null> {
		const row = await this.prisma.plan.findUnique({ where: { slug }, include: { entitlements: true } });
		return row ? PlanMapper.toDomain(row) : null;
	}

	async findById(id: string): Promise<Plan | null> {
		const row = await this.prisma.plan.findUnique({ where: { id }, include: { entitlements: true } });
		return row ? PlanMapper.toDomain(row) : null;
	}
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { CustomRole } from "../../domain/entities/custom-role.entity";
import { CustomRoleAssignmentRepository, CustomRoleRepository } from "../../domain/repositories/custom-role.repository";
import { CustomRoleMapper } from "../mappers/custom-role.mapper";

@Injectable()
export class PrismaCustomRoleRepository extends CustomRoleRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async list(organizationId: string, includeInactive = false) {
		const rows = await this.prisma.customRole.findMany({
			where: { organizationId, ...(includeInactive ? {} : { active: true }) },
			orderBy: { createdAt: "desc" },
		});
		return rows.map(CustomRoleMapper.toDomain);
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.customRole.findFirst({ where: { id, organizationId } });
		return row ? CustomRoleMapper.toDomain(row) : null;
	}

	async findBySlug(organizationId: string, slug: string) {
		const row = await this.prisma.customRole.findFirst({ where: { organizationId, slug } });
		return row ? CustomRoleMapper.toDomain(row) : null;
	}

	async save(role: CustomRole): Promise<CustomRole> {
		const p = role.toPrimitives();
		const row = await this.prisma.customRole.create({
			data: {
				organizationId: p.organizationId,
				slug: p.slug,
				nameEn: p.nameEn,
				nameAm: p.nameAm,
				description: p.description,
				inheritsFromSlug: p.inheritsFromSlug,
				permissionsJson: p.permissionsJson as never,
				scopeJson: p.scopeJson as never,
				createdByUserId: p.createdByUserId,
				isSystem: p.isSystem,
				active: p.active,
			},
		});
		return CustomRoleMapper.toDomain(row);
	}

	async update(role: CustomRole): Promise<CustomRole> {
		const p = role.toPrimitives();
		const row = await this.prisma.customRole.update({
			where: { id: p.id },
			data: {
				nameEn: p.nameEn,
				nameAm: p.nameAm,
				description: p.description,
				inheritsFromSlug: p.inheritsFromSlug,
				permissionsJson: p.permissionsJson as never,
				scopeJson: p.scopeJson as never,
				active: p.active,
			},
		});
		return CustomRoleMapper.toDomain(row);
	}

	async delete(organizationId: string, id: string) {
		await this.prisma.customRole.deleteMany({ where: { id, organizationId } });
	}
}

@Injectable()
export class PrismaCustomRoleAssignmentRepository extends CustomRoleAssignmentRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async assign(customRoleId: string, organizationId: string, userId: string, assignedByUserId: string) {
		await this.prisma.customRoleAssignment.upsert({
			where: { customRoleId_userId: { customRoleId, userId } },
			create: { customRoleId, organizationId, userId, assignedByUserId },
			update: {},
		});
	}

	async unassign(customRoleId: string, userId: string) {
		await this.prisma.customRoleAssignment.deleteMany({ where: { customRoleId, userId } });
	}

	async listByRole(customRoleId: string) {
		const rows = await this.prisma.customRoleAssignment.findMany({
			where: { customRoleId },
			select: { userId: true, createdAt: true },
		});
		return rows;
	}

	async listByUser(organizationId: string, userId: string) {
		const rows = await this.prisma.customRoleAssignment.findMany({
			where: { organizationId, userId },
			select: { customRoleId: true },
		});
		return rows.map((r) => r.customRoleId);
	}

	async countByRole(customRoleId: string) {
		return this.prisma.customRoleAssignment.count({ where: { customRoleId } });
	}
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type {
	CreateEimsEnterpriseInput,
	CreateEimsEstablishmentInput,
	CreateEimsSourceSystemInput,
} from "../../domain/eims-setup.types";

@Injectable()
export class PrismaEimsSetupRepository extends EimsSetupRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	createEnterprise(organizationId: string, input: CreateEimsEnterpriseInput) {
		return this.prisma.eimsEnterprise.upsert({
			where: { organizationId_tin: { organizationId, tin: input.tin } },
			create: {
				organizationId,
				tin: input.tin,
				legalName: input.legalName,
				tradeName: input.tradeName ?? null,
				vatNumber: input.vatNumber ?? null,
				email: input.email ?? null,
				phone: input.phone ?? null,
				status: "draft",
			},
			update: {
				legalName: input.legalName,
				tradeName: input.tradeName ?? null,
				vatNumber: input.vatNumber ?? null,
				email: input.email ?? null,
				phone: input.phone ?? null,
			},
		});
	}

	listEnterprises(organizationId: string) {
		return this.prisma.eimsEnterprise.findMany({
			where: { organizationId },
			orderBy: { createdAt: "desc" },
		});
	}

	async createEstablishment(organizationId: string, input: CreateEimsEstablishmentInput) {
		const existing = await this.prisma.eimsEstablishment.findFirst({
			where: { organizationId, code: input.code },
		});
		if (existing) {
			return this.prisma.eimsEstablishment.update({
				where: { id: existing.id },
				data: {
					enterpriseId: input.enterpriseId,
					name: input.name,
					subTin: input.subTin ?? null,
					region: input.region ?? null,
					city: input.city ?? null,
				},
			});
		}
		return this.prisma.eimsEstablishment.create({
			data: {
				organizationId,
				enterpriseId: input.enterpriseId,
				name: input.name,
				code: input.code,
				subTin: input.subTin ?? null,
				region: input.region ?? null,
				city: input.city ?? null,
				status: "draft",
			},
		});
	}

	listEstablishments(organizationId: string, enterpriseId?: string) {
		return this.prisma.eimsEstablishment.findMany({
			where: { organizationId, ...(enterpriseId ? { enterpriseId } : {}) },
			orderBy: { createdAt: "desc" },
		});
	}

	async createSourceSystem(organizationId: string, input: CreateEimsSourceSystemInput) {
		const existing = await this.prisma.eimsSourceSystem.findFirst({
			where: {
				organizationId,
				OR: [
					{ name: input.name },
					...(input.systemNumber ? [{ systemNumber: input.systemNumber }] : []),
				],
			},
		});
		const source = existing
			? await this.prisma.eimsSourceSystem.update({
					where: { id: existing.id },
					data: {
						enterpriseId: input.enterpriseId,
						establishmentId: input.establishmentId,
						name: input.name,
						systemType: input.systemType,
						systemNumber: input.systemNumber ?? null,
						softwareVersion: input.softwareVersion ?? null,
						inHouseDeveloped: input.inHouseDeveloped ?? false,
						version: { increment: 1 },
					},
				})
			: await this.prisma.eimsSourceSystem.create({
					data: {
						organizationId,
						enterpriseId: input.enterpriseId,
						establishmentId: input.establishmentId,
						name: input.name,
						systemType: input.systemType,
						systemNumber: input.systemNumber ?? null,
						softwareVersion: input.softwareVersion ?? null,
						inHouseDeveloped: input.inHouseDeveloped ?? false,
						approvalStatus: "draft",
						active: false,
					},
				});
		await this.prisma.eimsSourceSystemCounter.upsert({
			where: { sourceSystemId: source.id },
			create: {
				organizationId,
				sourceSystemId: source.id,
				lastAcceptedCounter: BigInt(0),
				status: "healthy",
			},
			update: {},
		});
		return source;
	}

	listSourceSystems(organizationId: string, establishmentId?: string) {
		return this.prisma.eimsSourceSystem.findMany({
			where: { organizationId, ...(establishmentId ? { establishmentId } : {}) },
			orderBy: { createdAt: "desc" },
		});
	}
}

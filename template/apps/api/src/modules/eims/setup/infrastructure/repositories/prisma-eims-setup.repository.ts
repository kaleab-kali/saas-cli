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
		return this.prisma.eimsEnterprise.create({
			data: {
				organizationId,
				tin: input.tin,
				legalName: input.legalName,
				tradeName: input.tradeName ?? null,
				vatNumber: input.vatNumber ?? null,
				email: input.email ?? null,
				phone: input.phone ?? null,
				status: "draft",
			},
		});
	}

	listEnterprises(organizationId: string) {
		return this.prisma.eimsEnterprise.findMany({
			where: { organizationId },
			orderBy: { createdAt: "desc" },
		});
	}

	createEstablishment(organizationId: string, input: CreateEimsEstablishmentInput) {
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
		const source = await this.prisma.eimsSourceSystem.create({
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
		await this.prisma.eimsSourceSystemCounter.create({
			data: {
				organizationId,
				sourceSystemId: source.id,
				lastAcceptedCounter: BigInt(0),
				status: "healthy",
			},
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

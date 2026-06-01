import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type {
	CreateEimsEnterpriseInput,
	CreateEimsEstablishmentInput,
	CreateEimsSourceSystemInput,
	UpdateEimsSourceApprovalInput,
} from "../../domain/eims-setup.types";
import { nextSourceApprovalState } from "../../domain/source-approval.workflow";

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
				OR: [{ name: input.name }, ...(input.systemNumber ? [{ systemNumber: input.systemNumber }] : [])],
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

	async updateSourceApproval(organizationId: string, sourceSystemId: string, input: UpdateEimsSourceApprovalInput) {
		const existing = await this.prisma.eimsSourceSystem.findFirst({
			where: { id: sourceSystemId, organizationId },
			select: { id: true, approvalStatus: true },
		});
		if (!existing) throw new NotFoundException("EIMS source system not found");

		const next = nextSourceApprovalState(existing.approvalStatus, input.approvalStatus);
		const now = new Date();
		return this.prisma.eimsSourceSystem.update({
			where: { id: existing.id },
			data: {
				approvalStatus: next.approvalStatus,
				active: next.active,
				approvalNotes: input.approvalNotes ?? null,
				updateRequestedStatus: null,
				...(next.approvalStatus === "submitted" ? { approvalSubmittedAt: now, approvalDecidedAt: null } : {}),
				...(next.approvalStatus === "approved" || next.approvalStatus === "rejected" ? { approvalDecidedAt: now } : {}),
				...(next.approvalStatus === "disabled" ? { disabledAt: now } : { disabledAt: null }),
				version: { increment: 1 },
			},
		});
	}

	async getSourceSubmissionReadiness(organizationId: string, sourceSystemId: string) {
		const [source, credential, certificate, counter] = await Promise.all([
			this.prisma.eimsSourceSystem.findFirst({
				where: { id: sourceSystemId, organizationId },
				select: { approvalStatus: true, active: true, systemNumber: true },
			}),
			this.prisma.eimsCredential.findFirst({
				where: { organizationId, sourceSystemId, lastTestStatus: "success" },
				orderBy: { lastTestedAt: "desc" },
				select: { lastTestedAt: true },
			}),
			this.prisma.eimsCertificate.findFirst({
				where: { organizationId, sourceSystemId, status: { in: ["valid", "expires_soon"] } },
				orderBy: { validTo: "desc" },
				select: { validTo: true },
			}),
			this.prisma.eimsSourceSystemCounter.findUnique({
				where: { sourceSystemId },
				select: { sourceSystemId: true },
			}),
		]);
		if (!source) return null;

		return {
			approvalStatus: source.approvalStatus,
			active: source.active,
			systemNumber: source.systemNumber,
			credentialLastTestedAt: credential?.lastTestedAt ?? null,
			certificateValidTo: certificate?.validTo ?? null,
			counterInitialized: Boolean(counter),
		};
	}
}

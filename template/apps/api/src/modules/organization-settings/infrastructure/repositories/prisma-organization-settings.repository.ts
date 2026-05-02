import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { OrganizationSettings } from "../../domain/entities/organization-settings.entity";
import { OrganizationSettingsRepository } from "../../domain/repositories/organization-settings.repository";
import { OrganizationSettingsMapper } from "../mappers/organization-settings.mapper";

@Injectable()
export class PrismaOrganizationSettingsRepository extends OrganizationSettingsRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByOrg(organizationId: string): Promise<OrganizationSettings | null> {
		const row = await this.prisma.organizationSettings.findUnique({ where: { organizationId } });
		return row ? OrganizationSettingsMapper.toDomain(row) : null;
	}

	async upsert(settings: OrganizationSettings): Promise<OrganizationSettings> {
		const p = OrganizationSettingsMapper.toPersistence(settings);
		const row = await this.prisma.organizationSettings.upsert({
			where: { organizationId: p.organizationId },
			create: {
				organizationId: p.organizationId,
				timezone: p.timezone,
				currency: p.currency,
				dateFormat: p.dateFormat,
				fiscalYearStartMonth: p.fiscalYearStartMonth,
				invoiceNumberPrefix: p.invoiceNumberPrefix,
				invoiceNumberPadding: p.invoiceNumberPadding,
				emailFooter: p.emailFooter,
				logoUrl: p.logoUrl,
				primaryColor: p.primaryColor,
				companyAddress: p.companyAddress,
				companyPhone: p.companyPhone,
				companyEmail: p.companyEmail,
				taxId: p.taxId,
				taxRatePct: p.taxRatePct,
			},
			update: {
				timezone: p.timezone,
				currency: p.currency,
				dateFormat: p.dateFormat,
				fiscalYearStartMonth: p.fiscalYearStartMonth,
				invoiceNumberPrefix: p.invoiceNumberPrefix,
				invoiceNumberPadding: p.invoiceNumberPadding,
				emailFooter: p.emailFooter,
				logoUrl: p.logoUrl,
				primaryColor: p.primaryColor,
				companyAddress: p.companyAddress,
				companyPhone: p.companyPhone,
				companyEmail: p.companyEmail,
				taxId: p.taxId,
				taxRatePct: p.taxRatePct,
			},
		});
		return OrganizationSettingsMapper.toDomain(row);
	}
}

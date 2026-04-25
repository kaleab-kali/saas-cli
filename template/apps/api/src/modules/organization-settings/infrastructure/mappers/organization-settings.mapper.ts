import type { OrganizationSettings as PrismaOrgSettings } from "../../../../generated/prisma/client";
import {
	OrganizationSettings,
	type OrganizationSettingsProps,
} from "../../domain/entities/organization-settings.entity";

export class OrganizationSettingsMapper {
	static toDomain(row: PrismaOrgSettings): OrganizationSettings {
		return OrganizationSettings.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			timezone: row.timezone,
			currency: row.currency,
			areaUnit: row.areaUnit,
			dateFormat: row.dateFormat,
			fiscalYearStartMonth: row.fiscalYearStartMonth,
			invoiceNumberPrefix: row.invoiceNumberPrefix,
			invoiceNumberPadding: row.invoiceNumberPadding,
			emailFooter: row.emailFooter,
			logoUrl: row.logoUrl,
			primaryColor: row.primaryColor,
			companyAddress: row.companyAddress,
			companyPhone: row.companyPhone,
			companyEmail: row.companyEmail,
			taxId: row.taxId,
			allowGmViewAgentContacts: row.allowGmViewAgentContacts,
			allowGmExportAgentContacts: row.allowGmExportAgentContacts,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toPersistence(entity: OrganizationSettings): Omit<OrganizationSettingsProps, "id"> & { id?: string } {
		const p = entity.toPrimitives();
		return p;
	}

	static toDto(entity: OrganizationSettings) {
		return entity.toPrimitives();
	}
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { OrganizationSettings } from "../../../domain/entities/organization-settings.entity";
import { ORG_SETTINGS_EVENTS } from "../../../domain/events/settings.events";
import { OrganizationSettingsRepository } from "../../../domain/repositories/organization-settings.repository";
import type { UpdateOrganizationSettingsDto } from "../../dto/organization-settings.dto";

const DEFAULTS = {
	timezone: "UTC",
	currency: "USD",
	areaUnit: "sqm",
	dateFormat: "YYYY-MM-DD",
	fiscalYearStartMonth: 1,
	invoiceNumberPrefix: "INV-",
	invoiceNumberPadding: 5,
} as const;

@Injectable()
export class UpdateSettingsHandler {
	constructor(
		private readonly repo: OrganizationSettingsRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: UpdateOrganizationSettingsDto) {
		const existing = await this.repo.findByOrg(organizationId);
		if (existing) {
			existing.update(dto);
			const saved = await this.repo.upsert(existing);
			this.events.emit({
				eventName: ORG_SETTINGS_EVENTS.UPDATED,
				organizationId,
				payload: { changedFields: Object.keys(dto) },
			});
			return saved;
		}
		const created = OrganizationSettings.create({
			id: "",
			organizationId,
			timezone: dto.timezone ?? DEFAULTS.timezone,
			currency: dto.currency ?? DEFAULTS.currency,
			areaUnit: dto.areaUnit ?? DEFAULTS.areaUnit,
			dateFormat: dto.dateFormat ?? DEFAULTS.dateFormat,
			fiscalYearStartMonth: dto.fiscalYearStartMonth ?? DEFAULTS.fiscalYearStartMonth,
			invoiceNumberPrefix: dto.invoiceNumberPrefix ?? DEFAULTS.invoiceNumberPrefix,
			invoiceNumberPadding: dto.invoiceNumberPadding ?? DEFAULTS.invoiceNumberPadding,
			emailFooter: dto.emailFooter ?? null,
			logoUrl: dto.logoUrl ?? null,
			primaryColor: dto.primaryColor ?? null,
			companyAddress: dto.companyAddress ?? null,
			companyPhone: dto.companyPhone ?? null,
			companyEmail: dto.companyEmail ?? null,
			taxId: dto.taxId ?? null,
			allowGmViewAgentContacts: dto.allowGmViewAgentContacts ?? false,
			allowGmExportAgentContacts: dto.allowGmExportAgentContacts ?? false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const saved = await this.repo.upsert(created);
		this.events.emit({
			eventName: ORG_SETTINGS_EVENTS.UPDATED,
			organizationId,
			payload: { changedFields: Object.keys(dto) },
		});
		return saved;
	}
}

@Injectable()
export class GetSettingsHandler {
	constructor(private readonly repo: OrganizationSettingsRepository) {}

	async execute(organizationId: string) {
		const settings = await this.repo.findByOrg(organizationId);
		if (!settings) {
			// return defaults as unsaved entity
			return OrganizationSettings.rehydrate({
				id: "",
				organizationId,
				timezone: DEFAULTS.timezone,
				currency: DEFAULTS.currency,
				areaUnit: DEFAULTS.areaUnit,
				dateFormat: DEFAULTS.dateFormat,
				fiscalYearStartMonth: DEFAULTS.fiscalYearStartMonth,
				invoiceNumberPrefix: DEFAULTS.invoiceNumberPrefix,
				invoiceNumberPadding: DEFAULTS.invoiceNumberPadding,
				emailFooter: null,
				logoUrl: null,
				primaryColor: null,
				companyAddress: null,
				companyPhone: null,
				companyEmail: null,
				taxId: null,
				allowGmViewAgentContacts: false,
				allowGmExportAgentContacts: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
		return settings;
	}

	async requireExisting(organizationId: string) {
		const s = await this.repo.findByOrg(organizationId);
		if (!s) throw new NotFoundException("settings not configured");
		return s;
	}
}

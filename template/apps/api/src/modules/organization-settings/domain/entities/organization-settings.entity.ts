import { BadRequestException } from "@nestjs/common";
import { isAreaUnit, isDateFormat } from "../value-objects/settings.vo";

export interface OrganizationSettingsProps {
	id: string;
	organizationId: string;
	timezone: string;
	currency: string;
	areaUnit: string;
	dateFormat: string;
	fiscalYearStartMonth: number;
	invoiceNumberPrefix: string;
	invoiceNumberPadding: number;
	emailFooter: string | null;
	logoUrl: string | null;
	primaryColor: string | null;
	companyAddress: string | null;
	companyPhone: string | null;
	companyEmail: string | null;
	taxId: string | null;
	allowGmViewAgentContacts: boolean;
	allowGmExportAgentContacts: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export class OrganizationSettings {
	private constructor(private props: OrganizationSettingsProps) {}

	static create(props: OrganizationSettingsProps) {
		OrganizationSettings.validate(props);
		return new OrganizationSettings(props);
	}

	static rehydrate(props: OrganizationSettingsProps) {
		return new OrganizationSettings(props);
	}

	private static validate(p: Partial<OrganizationSettingsProps>) {
		if (p.areaUnit && !isAreaUnit(p.areaUnit)) throw new BadRequestException(`invalid areaUnit: ${p.areaUnit}`);
		if (p.dateFormat && !isDateFormat(p.dateFormat))
			throw new BadRequestException(`invalid dateFormat: ${p.dateFormat}`);
		if (p.fiscalYearStartMonth !== undefined && (p.fiscalYearStartMonth < 1 || p.fiscalYearStartMonth > 12)) {
			throw new BadRequestException("fiscalYearStartMonth must be 1-12");
		}
		if (p.invoiceNumberPadding !== undefined && (p.invoiceNumberPadding < 1 || p.invoiceNumberPadding > 10)) {
			throw new BadRequestException("invoiceNumberPadding must be 1-10");
		}
	}

	get id() {
		return this.props.id;
	}

	update(input: Partial<Omit<OrganizationSettingsProps, "id" | "organizationId" | "createdAt">>) {
		OrganizationSettings.validate(input);
		Object.assign(this.props, input);
		this.props.updatedAt = new Date();
	}

	toPrimitives(): OrganizationSettingsProps {
		return { ...this.props };
	}
}

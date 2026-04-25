import { BadRequestException } from "@nestjs/common";
import { isDateFormat } from "../value-objects/settings.vo";

export interface OrganizationSettingsProps {
	id: string;
	organizationId: string;
	timezone: string;
	currency: string;
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
	taxRatePct: number;
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
		if (p.dateFormat && !isDateFormat(p.dateFormat))
			throw new BadRequestException(`invalid dateFormat: ${p.dateFormat}`);
		if (p.fiscalYearStartMonth !== undefined && (p.fiscalYearStartMonth < 1 || p.fiscalYearStartMonth > 12)) {
			throw new BadRequestException("fiscalYearStartMonth must be 1-12");
		}
		if (p.invoiceNumberPadding !== undefined && (p.invoiceNumberPadding < 1 || p.invoiceNumberPadding > 10)) {
			throw new BadRequestException("invoiceNumberPadding must be 1-10");
		}
		if (p.taxRatePct !== undefined && (p.taxRatePct < 0 || p.taxRatePct > 100)) {
			throw new BadRequestException("taxRatePct must be 0-100");
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

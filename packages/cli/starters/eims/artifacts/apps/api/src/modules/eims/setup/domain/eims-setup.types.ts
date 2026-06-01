export interface EimsEnterpriseRecord {
	id: string;
	organizationId: string;
	tin: string;
	legalName: string;
	tradeName: string | null;
	vatNumber: string | null;
	status: string;
}

export interface EimsEstablishmentRecord {
	id: string;
	organizationId: string;
	enterpriseId: string;
	name: string;
	code: string;
	subTin: string | null;
	status: string;
}

export interface EimsSourceSystemRecord {
	id: string;
	organizationId: string;
	enterpriseId: string;
	establishmentId: string;
	name: string;
	systemNumber: string | null;
	systemType: string;
	approvalStatus: string;
	active: boolean;
	approvalSubmittedAt?: Date | string | null;
	approvalDecidedAt?: Date | string | null;
	approvalNotes?: string | null;
	disabledAt?: Date | string | null;
}

export interface CreateEimsEnterpriseInput {
	tin: string;
	legalName: string;
	tradeName?: string | null;
	vatNumber?: string | null;
	email?: string | null;
	phone?: string | null;
}

export interface CreateEimsEstablishmentInput {
	enterpriseId: string;
	name: string;
	code: string;
	subTin?: string | null;
	region?: string | null;
	city?: string | null;
}

export interface CreateEimsSourceSystemInput {
	enterpriseId: string;
	establishmentId: string;
	name: string;
	systemType: string;
	systemNumber?: string | null;
	softwareVersion?: string | null;
	inHouseDeveloped?: boolean;
}

export interface UpdateEimsSourceApprovalInput {
	approvalStatus: string;
	approvalNotes?: string | null;
}

import type {
	CreateEimsEnterpriseInput,
	CreateEimsEstablishmentInput,
	CreateEimsSourceSystemInput,
	EimsEnterpriseRecord,
	EimsEstablishmentRecord,
	EimsSourceSystemRecord,
} from "./eims-setup.types";

export abstract class EimsSetupRepository {
	abstract createEnterprise(organizationId: string, input: CreateEimsEnterpriseInput): Promise<EimsEnterpriseRecord>;

	abstract listEnterprises(organizationId: string): Promise<EimsEnterpriseRecord[]>;

	abstract createEstablishment(
		organizationId: string,
		input: CreateEimsEstablishmentInput,
	): Promise<EimsEstablishmentRecord>;

	abstract listEstablishments(organizationId: string, enterpriseId?: string): Promise<EimsEstablishmentRecord[]>;

	abstract createSourceSystem(
		organizationId: string,
		input: CreateEimsSourceSystemInput,
	): Promise<EimsSourceSystemRecord>;

	abstract listSourceSystems(organizationId: string, establishmentId?: string): Promise<EimsSourceSystemRecord[]>;
}

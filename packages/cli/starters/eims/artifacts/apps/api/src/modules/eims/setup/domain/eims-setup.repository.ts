import type {
	CreateEimsEnterpriseInput,
	CreateEimsEstablishmentInput,
	CreateEimsSourceSystemInput,
	EimsEnterpriseRecord,
	EimsEstablishmentRecord,
	EimsSourceSystemRecord,
	UpdateEimsSourceApprovalInput,
} from "./eims-setup.types";
import type { SourceSubmissionReadiness } from "./source-submission.guard";

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

	abstract updateSourceApproval(
		organizationId: string,
		sourceSystemId: string,
		input: UpdateEimsSourceApprovalInput,
	): Promise<EimsSourceSystemRecord>;

	abstract getSourceSubmissionReadiness(
		organizationId: string,
		sourceSystemId: string,
	): Promise<SourceSubmissionReadiness | null>;
}

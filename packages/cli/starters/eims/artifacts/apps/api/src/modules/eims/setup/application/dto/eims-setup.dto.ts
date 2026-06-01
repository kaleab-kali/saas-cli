import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import { EIMS_SOURCE_APPROVAL_STATUSES } from "../../domain/source-approval.workflow";

export class CreateEimsEnterpriseDto {
	@IsString()
	@Matches(/^\d{10}$/)
	tin!: string;

	@IsString()
	@Length(2, 200)
	legalName!: string;

	@IsOptional()
	@IsString()
	tradeName?: string;

	@IsOptional()
	@IsString()
	vatNumber?: string;

	@IsOptional()
	@IsString()
	email?: string;

	@IsOptional()
	@IsString()
	phone?: string;
}

export class CreateEimsEstablishmentDto {
	@IsString()
	enterpriseId!: string;

	@IsString()
	@Length(2, 120)
	name!: string;

	@IsString()
	@Length(2, 16)
	code!: string;

	@IsOptional()
	@IsString()
	subTin?: string;

	@IsOptional()
	@IsString()
	region?: string;

	@IsOptional()
	@IsString()
	city?: string;
}

export class CreateEimsSourceSystemDto {
	@IsString()
	enterpriseId!: string;

	@IsString()
	establishmentId!: string;

	@IsString()
	@Length(2, 120)
	name!: string;

	@IsIn(["POS", "ERP", "CRM", "SYS", "MAN", "EFD"])
	systemType!: string;

	@IsOptional()
	@IsString()
	systemNumber?: string;

	@IsOptional()
	@IsString()
	softwareVersion?: string;

	@IsOptional()
	@IsBoolean()
	inHouseDeveloped?: boolean;
}

export class UpdateEimsSourceApprovalDto {
	@IsIn(EIMS_SOURCE_APPROVAL_STATUSES)
	approvalStatus!: string;

	@IsOptional()
	@IsString()
	@Length(0, 500)
	approvalNotes?: string;
}

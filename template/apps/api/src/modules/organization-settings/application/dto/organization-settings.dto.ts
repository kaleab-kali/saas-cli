import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AREA_UNITS, DATE_FORMATS } from "../../domain/value-objects/settings.vo";

export class UpdateOrganizationSettingsDto {
	@ApiProperty({ required: false }) @IsOptional() @IsString() timezone?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() currency?: string;
	@ApiProperty({ required: false, enum: AREA_UNITS })
	@IsOptional()
	@IsIn(AREA_UNITS as readonly string[])
	areaUnit?: string;
	@ApiProperty({ required: false, enum: DATE_FORMATS })
	@IsOptional()
	@IsIn(DATE_FORMATS as readonly string[])
	dateFormat?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStartMonth?: number;
	@ApiProperty({ required: false }) @IsOptional() @IsString() invoiceNumberPrefix?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) @Max(10) invoiceNumberPadding?: number;
	@ApiProperty({ required: false }) @IsOptional() @IsString() emailFooter?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsString() logoUrl?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsString() primaryColor?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsString() companyAddress?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsString() companyPhone?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() allowGmViewAgentContacts?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() allowGmExportAgentContacts?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsString() companyEmail?: string | null;
	@ApiProperty({ required: false }) @IsOptional() @IsString() taxId?: string | null;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { AUDIENCE_TYPES, type AudienceType } from "../../domain/value-objects/notification.vo";

export class CreateBulkDto {
	@ApiProperty() @IsString() @MaxLength(200) name!: string;
	@ApiProperty() @IsString() @MaxLength(300) subject!: string;
	@ApiProperty() @IsString() bodyHtml!: string;
	@ApiProperty({ enum: AUDIENCE_TYPES }) @IsIn(AUDIENCE_TYPES as readonly string[]) audienceType!: AudienceType;
	@ApiProperty({ required: false }) @IsOptional() @IsString() audienceRef?: string;
}

export class UpdateBulkDraftDto {
	@ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() subject?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() bodyHtml?: string;
}

export class ScheduleBulkDto {
	@ApiProperty() @IsDateString() scheduledAt!: string;
}

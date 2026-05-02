import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, Matches } from "class-validator";

export class CreateCustomRoleDto {
	@ApiProperty() @IsString() @Matches(/^[a-z0-9-]{2,40}$/) slug!: string;
	@ApiProperty() @IsString() nameEn!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() nameAm?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() inheritsFromSlug?: string;
	@ApiProperty({ type: Object }) @IsObject() permissionsJson!: Record<string, string[]>;
	@ApiProperty({ required: false, type: Object }) @IsOptional() @IsObject() scopeJson?: Record<string, unknown>;
}

export class UpdateCustomRoleDto {
	@ApiProperty({ required: false }) @IsOptional() @IsString() nameEn?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() nameAm?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() inheritsFromSlug?: string;
	@ApiProperty({ required: false, type: Object }) @IsOptional() @IsObject() permissionsJson?: Record<string, string[]>;
	@ApiProperty({ required: false, type: Object }) @IsOptional() @IsObject() scopeJson?: Record<string, unknown>;
	@ApiProperty({ required: false }) @IsOptional() active?: boolean;
}

export class AssignRoleDto {
	@ApiProperty() @IsString() userId!: string;
}

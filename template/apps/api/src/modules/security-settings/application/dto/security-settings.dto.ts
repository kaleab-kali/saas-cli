import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateSecuritySettingsDto {
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(6) @Max(128) passwordMinLength?: number;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() passwordRequireUpper?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() passwordRequireLower?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() passwordRequireDigit?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() passwordRequireSymbol?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) passwordMaxAgeDays?: number | null;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(5) @Max(43200) sessionTimeoutMinutes?: number;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() force2fa?: boolean;
	@ApiProperty({ required: false, type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	ipAllowlist?: string[];
}

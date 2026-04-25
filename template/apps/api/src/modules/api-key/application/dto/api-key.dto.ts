import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { API_KEY_SCOPES } from "../../domain/value-objects/scope.vo";

export class CreateApiKeyDto {
	@ApiProperty() @IsString() name!: string;
	@ApiProperty({ isArray: true, enum: API_KEY_SCOPES })
	@IsArray()
	@ArrayMinSize(1)
	@IsIn(API_KEY_SCOPES as readonly string[], { each: true })
	scopes!: string[];
	@ApiProperty({ required: false }) @IsOptional() @IsDateString() expiresAt?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) rateLimit?: number;
}

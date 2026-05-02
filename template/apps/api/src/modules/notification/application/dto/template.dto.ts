import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertTemplateDto {
	@ApiProperty() @IsString() eventKey!: string;
	@ApiProperty() @IsString() @MaxLength(300) subject!: string;
	@ApiProperty() @IsString() bodyHtml!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() bodyText?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

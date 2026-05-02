import { ApiProperty } from "@nestjs/swagger";
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsEmail,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Matches,
	Max,
	Min,
} from "class-validator";
import {
	EXPORT_FORMATS,
	type ExportFormat,
	SCHEDULE_FREQUENCIES,
	type ScheduleFrequency,
} from "../../domain/value-objects/report.vo";

export class CreateScheduleDto {
	@ApiProperty() @IsString() reportId!: string;
	@ApiProperty({ enum: SCHEDULE_FREQUENCIES })
	@IsIn(SCHEDULE_FREQUENCIES as readonly string[])
	frequency!: ScheduleFrequency;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) @Max(6) dayOfWeek?: number;
	@ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) @Max(31) dayOfMonth?: number;
	@ApiProperty() @Matches(/^\d{2}:\d{2}$/) timeOfDay!: string;
	@ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @IsEmail({}, { each: true }) recipients!: string[];
	@ApiProperty({ enum: EXPORT_FORMATS }) @IsIn(EXPORT_FORMATS as readonly string[]) format!: ExportFormat;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() enabled?: boolean;
}

export class ExecuteReportDto {
	@ApiProperty({ enum: EXPORT_FORMATS, required: false })
	@IsOptional()
	@IsIn(EXPORT_FORMATS as readonly string[])
	format?: ExportFormat;
}

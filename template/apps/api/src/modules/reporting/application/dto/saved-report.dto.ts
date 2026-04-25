import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsIn,
	IsOptional,
	IsString,
	MaxLength,
	ValidateNested,
} from "class-validator";
import { CHART_TYPES, type ChartType, DATA_SOURCES, type DataSource } from "../../domain/value-objects/report.vo";

export class ReportColumnDto {
	@ApiProperty() @IsString() field!: string;
	@ApiProperty() @IsString() label!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() agg?: string;
}

export class ReportFilterDto {
	@ApiProperty() @IsString() field!: string;
	@ApiProperty() @IsString() operator!: string;
	@ApiProperty() value!: unknown;
}

export class ReportSortDto {
	@ApiProperty() @IsString() field!: string;
	@ApiProperty() @IsString() dir!: "asc" | "desc";
}

export class CreateSavedReportDto {
	@ApiProperty() @IsString() @MaxLength(200) name!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) description?: string;
	@ApiProperty({ enum: DATA_SOURCES }) @IsIn(DATA_SOURCES as readonly string[]) dataSource!: DataSource;
	@ApiProperty({ type: [ReportColumnDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => ReportColumnDto)
	columns!: ReportColumnDto[];
	@ApiProperty({ type: [ReportFilterDto], required: false })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReportFilterDto)
	filters?: ReportFilterDto[];
	@ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() groupBy?: string[];
	@ApiProperty({ type: [ReportSortDto], required: false })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReportSortDto)
	sort?: ReportSortDto[];
	@ApiProperty({ enum: CHART_TYPES, required: false })
	@IsOptional()
	@IsIn(CHART_TYPES as readonly string[])
	chartType?: ChartType;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() isTemplate?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() sharedWithTeam?: boolean;
}

export class UpdateSavedReportDto {
	@ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
	@ApiProperty({ type: [ReportColumnDto], required: false })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReportColumnDto)
	columns?: ReportColumnDto[];
	@ApiProperty({ type: [ReportFilterDto], required: false })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReportFilterDto)
	filters?: ReportFilterDto[];
	@ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() groupBy?: string[];
	@ApiProperty({ type: [ReportSortDto], required: false })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReportSortDto)
	sort?: ReportSortDto[];
	@ApiProperty({ enum: CHART_TYPES, required: false })
	@IsOptional()
	@IsIn(CHART_TYPES as readonly string[])
	chartType?: ChartType;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() isTemplate?: boolean;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() sharedWithTeam?: boolean;
}

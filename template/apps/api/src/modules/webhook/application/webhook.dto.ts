import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
} from "class-validator";

export class CreateWebhookEndpointDto {
	@IsString()
	@MaxLength(120)
	name!: string;

	@IsUrl({ require_protocol: true, protocols: ["https"] })
	url!: string;

	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(50)
	@IsString({ each: true })
	events!: string[];

	@IsOptional()
	@IsString()
	@MaxLength(200)
	secret?: string;
}

export class UpdateWebhookEndpointDto {
	@IsOptional()
	@IsString()
	@MaxLength(120)
	name?: string;

	@IsOptional()
	@IsUrl({ require_protocol: true, protocols: ["https"] })
	url?: string;

	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(50)
	@IsString({ each: true })
	events?: string[];

	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	secret?: string;
}

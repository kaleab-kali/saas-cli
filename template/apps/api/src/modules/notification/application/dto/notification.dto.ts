import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import {
	EMAIL_FREQUENCIES,
	type EmailFrequency,
	NOTIFICATION_CATEGORIES,
	NOTIFICATION_SEVERITIES,
	type NotificationCategory,
	type NotificationSeverity,
} from "../../domain/value-objects/notification.vo";

export class CreateNotificationDto {
	@ApiProperty() @IsString() userId!: string;
	@ApiProperty({ enum: NOTIFICATION_CATEGORIES })
	@IsIn(NOTIFICATION_CATEGORIES as readonly string[])
	category!: NotificationCategory;
	@ApiProperty({ enum: NOTIFICATION_SEVERITIES, required: false })
	@IsOptional()
	@IsIn(NOTIFICATION_SEVERITIES as readonly string[])
	severity?: NotificationSeverity;
	@ApiProperty() @IsString() @MaxLength(300) title!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) body?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() linkUrl?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() sourceEvent?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() sourceRef?: string;
}

export class UpdatePreferenceDto {
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() inApp?: boolean;
	@ApiProperty({ enum: EMAIL_FREQUENCIES, required: false })
	@IsOptional()
	@IsIn(EMAIL_FREQUENCIES as readonly string[])
	email?: EmailFrequency;
	@ApiProperty({ required: false }) @IsOptional() @IsBoolean() sms?: boolean;
}

export class UpsertPreferenceDto extends UpdatePreferenceDto {
	@ApiProperty() @IsString() eventKey!: string;
}

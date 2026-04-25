import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { BILLING_INTERVALS, PAYMENT_METHODS, PLAN_SLUGS } from "../../domain/value-objects/feature-keys.vo";

export class StartSubscriptionDto {
	@ApiProperty({ enum: PLAN_SLUGS }) @IsIn(PLAN_SLUGS as readonly string[]) planSlug!: string;
	@ApiProperty({ enum: BILLING_INTERVALS }) @IsIn(BILLING_INTERVALS as readonly string[]) billingInterval!: string;
}

export class ChangePlanDto {
	@ApiProperty({ enum: PLAN_SLUGS }) @IsIn(PLAN_SLUGS as readonly string[]) planSlug!: string;
	@ApiProperty({ required: false, enum: BILLING_INTERVALS })
	@IsOptional()
	@IsIn(BILLING_INTERVALS as readonly string[])
	billingInterval?: string;
}

export class CancelSubscriptionDto {
	@ApiProperty({ required: false, default: false })
	@IsOptional()
	immediate?: boolean;
}

export class ActivateCampaignDto {
	@ApiProperty() @IsInt() @Min(1) @Max(365) days!: number;
}

export class RecordManualPaymentDto {
	@ApiProperty() @IsString() invoiceId!: string;
	@ApiProperty() @IsInt() @Min(1) amount!: number;
	@ApiProperty({ enum: PAYMENT_METHODS }) @IsIn(PAYMENT_METHODS as readonly string[]) method!: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() receiptNumber?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() bankReference?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
	@ApiProperty({ required: false }) @IsOptional() @IsString() paidAt?: string;
}

export class InitiateChapaPaymentDto {
	@ApiProperty() @IsString() invoiceId!: string;
}

export class VerifyPaymentDto {
	@ApiProperty() @IsString() id!: string;
}

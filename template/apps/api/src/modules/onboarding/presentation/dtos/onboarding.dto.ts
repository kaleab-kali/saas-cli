import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export const ONBOARDING_MODES = ["CONCIERGE", "SELF_SERVICE", "HYBRID"] as const;
export const ONBOARDING_TASK_STATUSES = ["ACTIVE", "COMPLETED", "BLOCKED", "CANCELLED"] as const;
export const ONBOARDING_STEP_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED", "FAILED"] as const;

export type OnboardingModeInput = (typeof ONBOARDING_MODES)[number];
export type OnboardingTaskStatusInput = (typeof ONBOARDING_TASK_STATUSES)[number];

export class ListOnboardingTasksQueryDto {
	@ApiProperty({ required: false, enum: ONBOARDING_TASK_STATUSES })
	@IsOptional()
	@IsIn(ONBOARDING_TASK_STATUSES)
	status?: OnboardingTaskStatusInput;

	@ApiProperty({ required: false, enum: ONBOARDING_MODES })
	@IsOptional()
	@IsIn(ONBOARDING_MODES)
	mode?: OnboardingModeInput;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	templateKey?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	assignedToUserId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	vertical?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiProperty({ required: false, description: "Sort as field:asc or field:desc" })
	@IsOptional()
	@IsString()
	sort?: string;

	@ApiProperty({ required: false, default: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	page?: number;

	@ApiProperty({ required: false, default: 20 })
	@IsOptional()
	@IsInt()
	@Min(1)
	limit?: number;
}

export class CreateOnboardingTaskDto {
	@ApiProperty()
	@IsString()
	organizationId!: string;

	@ApiProperty()
	@IsString()
	templateKey!: string;

	@ApiProperty({ required: false, enum: ONBOARDING_MODES, default: "CONCIERGE" })
	@IsOptional()
	@IsIn(ONBOARDING_MODES)
	mode?: OnboardingModeInput;

	@ApiProperty()
	@IsString()
	contactName!: string;

	@ApiProperty()
	@IsString()
	contactPhone!: string;

	@ApiProperty()
	@IsEmail()
	contactEmail!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	assignedToUserId?: string;

	@ApiProperty({ required: false, type: Object })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, unknown>;
}

export class CompleteOnboardingStepDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	notes?: string;

	@ApiProperty({ required: false, type: Object })
	@IsOptional()
	@IsObject()
	capturedData?: Record<string, unknown>;
}

export class AssignOnboardingTaskDto {
	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	assignedToUserId?: string | null;
}

export class BlockOnboardingTaskDto {
	@ApiProperty()
	@IsString()
	reason!: string;
}

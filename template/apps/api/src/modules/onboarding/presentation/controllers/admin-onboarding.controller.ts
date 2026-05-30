import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { AdminPermissionsGuard, RequirePlatformMin } from "#modules/admin/guards/admin-permissions.guard";
import { OnboardingService } from "../../application/onboarding.service";
import {
	AssignOnboardingTaskDto,
	BlockOnboardingTaskDto,
	CompleteOnboardingStepDto,
	CreateOnboardingTaskDto,
	ListOnboardingTasksQueryDto,
} from "../dtos/onboarding.dto";

interface AdminRequest {
	adminUser?: { id?: string };
}

const adminUserId = (req: AdminRequest) => req.adminUser?.id ?? null;

@ApiTags("Admin Onboarding")
@AllowAnonymous()
@Controller("admin/onboarding")
@UseGuards(AdminPermissionsGuard)
@RequirePlatformMin("support")
export class AdminOnboardingController {
	constructor(private readonly onboarding: OnboardingService) {}

	@Get()
	@ApiOperation({ summary: "List tenant onboarding tasks" })
	async list(@Query() query: ListOnboardingTasksQueryDto) {
		return this.onboarding.listTasks(query);
	}

	@Get("summary")
	@ApiOperation({ summary: "Get onboarding operations summary" })
	async summary() {
		return { data: await this.onboarding.summary() };
	}

	@Get("templates")
	@ApiOperation({ summary: "List active onboarding task templates" })
	async templates() {
		return { data: await this.onboarding.listTemplates() };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get onboarding task detail" })
	async detail(@Param("id") id: string) {
		return { data: await this.onboarding.getTask(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create tenant onboarding task" })
	async create(@Body() dto: CreateOnboardingTaskDto, @Req() req: AdminRequest) {
		return { data: await this.onboarding.createTask(dto, adminUserId(req)) };
	}

	@Post(":id/steps/:stepKey/complete")
	@ApiOperation({ summary: "Complete an onboarding step as staff" })
	async completeStep(
		@Param("id") id: string,
		@Param("stepKey") stepKey: string,
		@Body() dto: CompleteOnboardingStepDto,
		@Req() req: AdminRequest,
	) {
		return { data: await this.onboarding.completeStep(id, stepKey, dto, adminUserId(req)) };
	}

	@Patch(":id/assignment")
	@ApiOperation({ summary: "Assign or unassign onboarding task staff owner" })
	async assign(@Param("id") id: string, @Body() dto: AssignOnboardingTaskDto, @Req() req: AdminRequest) {
		return { data: await this.onboarding.assignTask(id, dto, adminUserId(req)) };
	}

	@Post(":id/block")
	@ApiOperation({ summary: "Block an onboarding task" })
	async block(@Param("id") id: string, @Body() dto: BlockOnboardingTaskDto, @Req() req: AdminRequest) {
		return { data: await this.onboarding.blockTask(id, dto, adminUserId(req)) };
	}

	@Post(":id/cancel")
	@ApiOperation({ summary: "Cancel an onboarding task" })
	async cancel(@Param("id") id: string, @Req() req: AdminRequest) {
		return { data: await this.onboarding.cancelTask(id, adminUserId(req)) };
	}
}

import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { OnboardingService } from "../../application/onboarding.service";
import { CompleteOnboardingStepDto } from "../dtos/onboarding.dto";

interface TenantRequest {
	organizationId: string;
	user?: { id?: string };
	session?: { user?: { id?: string }; userId?: string };
}

const tenantUserId = (req: TenantRequest) => req.user?.id ?? req.session?.user?.id ?? req.session?.userId ?? null;

@ApiTags("Tenant Onboarding")
@Controller("onboarding")
@UseGuards(AuthGuard, PermissionsGuard)
export class TenantOnboardingController {
	constructor(private readonly onboarding: OnboardingService) {}

	@Get()
	@RequirePermissions("onboarding:read")
	@ApiOperation({ summary: "Get onboarding task for active organization" })
	async current(@Req() req: TenantRequest) {
		return { data: await this.onboarding.getTenantTask(req.organizationId) };
	}

	@Post("steps/:stepKey/complete")
	@RequirePermissions("onboarding:write")
	@ApiOperation({ summary: "Complete a tenant self-service onboarding step" })
	async completeSelfServiceStep(
		@Param("stepKey") stepKey: string,
		@Body() dto: CompleteOnboardingStepDto,
		@Req() req: TenantRequest,
	) {
		const task = await this.onboarding.getTenantTask(req.organizationId);
		if (!("id" in task)) return { data: task };
		return {
			data: await this.onboarding.completeStep(task.id, stepKey, dto, tenantUserId(req), {
				tenantSelfServiceOnly: true,
			}),
		};
	}
}

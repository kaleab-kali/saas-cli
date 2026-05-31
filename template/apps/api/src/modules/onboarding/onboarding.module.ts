import { Module } from "@nestjs/common";
import { AdminPermissionsGuard } from "#modules/admin/guards/admin-permissions.guard";
import { AuthModule } from "#modules/auth/auth.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { OnboardingService } from "./application/onboarding.service";
import { StaleOnboardingCron } from "./infrastructure/crons/stale-onboarding.cron";
import { AdminOnboardingController } from "./presentation/controllers/admin-onboarding.controller";
import { TenantOnboardingController } from "./presentation/controllers/tenant-onboarding.controller";

@Module({
	imports: [AuthModule, NotificationModule],
	controllers: [AdminOnboardingController, TenantOnboardingController],
	providers: [AdminPermissionsGuard, OnboardingService, StaleOnboardingCron],
	exports: [OnboardingService],
})
export class OnboardingModule {}

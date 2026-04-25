import { forwardRef, Module } from "@nestjs/common";
import { BillingModule } from "#modules/billing/billing.module";
import {
	ChangeSubscriptionPlanHandler,
	CreditAccountHandler,
	ExtendTrialHandler,
	ForceSubscriptionStatusHandler,
	SetManualPaymentModeHandler,
} from "./application/commands/admin-billing.handlers";
import {
	ArchivePlanHandler,
	CreatePlanHandler,
	ListAdminPlansHandler,
	UpdatePlanHandler,
	UpsertEntitlementHandler,
} from "./application/commands/admin-plan.handlers";
import { ForcePasswordResetHandler, ImpersonateUserHandler } from "./application/commands/admin-user-actions.handlers";
import { LogPlatformActionHandler } from "./application/commands/log-platform-action.handler";
import { SuspendOrganizationHandler } from "./application/commands/suspend-organization.handler";
import { ToggleFeatureFlagHandler } from "./application/commands/toggle-feature-flag.handler";
import { UnsuspendOrganizationHandler } from "./application/commands/unsuspend-organization.handler";
import { UpdatePlatformSettingHandler } from "./application/commands/update-platform-setting.handler";
import { GetOrganizationDetailHandler } from "./application/queries/get-organization-detail.handler";
import { GetPlatformStatsHandler } from "./application/queries/get-platform-stats.handler";
import { ListOrganizationsHandler } from "./application/queries/list-organizations.handler";
import { ListPlatformAuditLogsHandler } from "./application/queries/list-platform-audit-logs.handler";
import { ListUsersHandler } from "./application/queries/list-users.handler";
import { PlatformSettingsService } from "./application/services/platform-settings.service";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { AdminAuditController } from "./presentation/controllers/admin-audit.controller";
import { AdminAuthController } from "./presentation/controllers/admin-auth.controller";
import { AdminBillingController } from "./presentation/controllers/admin-billing.controller";
import { AdminEntitlementOverridesController } from "./presentation/controllers/admin-entitlement-overrides.controller";
import { AdminJobsController } from "./presentation/controllers/admin-jobs.controller";
import { AdminOrganizationsController } from "./presentation/controllers/admin-organizations.controller";
import { AdminPlansController } from "./presentation/controllers/admin-plans.controller";
import { AdminSettingsController } from "./presentation/controllers/admin-settings.controller";
import { AdminStatsController } from "./presentation/controllers/admin-stats.controller";
import { AdminSystemTemplatesController } from "./presentation/controllers/admin-system-templates.controller";
import { AdminUsersController } from "./presentation/controllers/admin-users.controller";

@Module({
	imports: [forwardRef(() => BillingModule)],
	controllers: [
		AdminAuthController,
		AdminOrganizationsController,
		AdminUsersController,
		AdminStatsController,
		AdminSettingsController,
		AdminAuditController,
		AdminPlansController,
		AdminBillingController,
		AdminSystemTemplatesController,
		AdminEntitlementOverridesController,
		AdminJobsController,
	],
	providers: [
		SuperAdminGuard,
		ListOrganizationsHandler,
		GetOrganizationDetailHandler,
		GetPlatformStatsHandler,
		ListPlatformAuditLogsHandler,
		ListUsersHandler,
		SuspendOrganizationHandler,
		UnsuspendOrganizationHandler,
		LogPlatformActionHandler,
		UpdatePlatformSettingHandler,
		ToggleFeatureFlagHandler,
		PlatformSettingsService,
		CreatePlanHandler,
		UpdatePlanHandler,
		ArchivePlanHandler,
		UpsertEntitlementHandler,
		ListAdminPlansHandler,
		ExtendTrialHandler,
		SetManualPaymentModeHandler,
		CreditAccountHandler,
		ChangeSubscriptionPlanHandler,
		ForceSubscriptionStatusHandler,
		ImpersonateUserHandler,
		ForcePasswordResetHandler,
	],
	exports: [PlatformSettingsService, LogPlatformActionHandler],
})
export class AdminModule {}

import { forwardRef, Module } from "@nestjs/common";
import { BillingModule } from "#modules/billing/billing.module";
import { MetricsModule } from "#shared/metrics/metrics.module";
import {
	ChangeSubscriptionPlanHandler,
	CreditAccountHandler,
	ExtendTrialHandler,
	ForceSubscriptionStatusHandler,
	SetSubscriptionGatewayHandler,
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
import { QueueMonitorService } from "./application/services/queue-monitor.service";
import { AdminPermissionsGuard } from "./guards/admin-permissions.guard";
import { SuperAdminGuard } from "./guards/super-admin.guard";
import { AdminAuditController } from "./presentation/controllers/admin-audit.controller";
import { AdminAuthController } from "./presentation/controllers/admin-auth.controller";
import { AdminBillingController } from "./presentation/controllers/admin-billing.controller";
import { AdminEntitlementOverridesController } from "./presentation/controllers/admin-entitlement-overrides.controller";
import { AdminJobsController } from "./presentation/controllers/admin-jobs.controller";
import { AdminOrganizationsController } from "./presentation/controllers/admin-organizations.controller";
import { AdminPlansController } from "./presentation/controllers/admin-plans.controller";
import { AdminServerController } from "./presentation/controllers/admin-server.controller";
import { AdminSettingsController } from "./presentation/controllers/admin-settings.controller";
import { AdminStatsController } from "./presentation/controllers/admin-stats.controller";
import { AdminSystemTemplatesController } from "./presentation/controllers/admin-system-templates.controller";
import { AdminUsersController } from "./presentation/controllers/admin-users.controller";

@Module({
	imports: [forwardRef(() => BillingModule), MetricsModule],
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
		AdminServerController,
	],
	providers: [
		SuperAdminGuard,
		AdminPermissionsGuard,
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
		QueueMonitorService,
		CreatePlanHandler,
		UpdatePlanHandler,
		ArchivePlanHandler,
		UpsertEntitlementHandler,
		ListAdminPlansHandler,
		ExtendTrialHandler,
		SetSubscriptionGatewayHandler,
		CreditAccountHandler,
		ChangeSubscriptionPlanHandler,
		ForceSubscriptionStatusHandler,
		ImpersonateUserHandler,
		ForcePasswordResetHandler,
	],
	exports: [PlatformSettingsService, LogPlatformActionHandler, AdminPermissionsGuard],
})
export class AdminModule {}

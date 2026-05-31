import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "#modules/admin/admin.module";
import { ApiKeyModule } from "#modules/api-key/api-key.module";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { AuthModule } from "#modules/auth/auth.module";
import { BillingModule } from "#modules/billing/billing.module";
import { SubscriptionStateGuard } from "#modules/billing/guards/subscription-state.guard";
import { PolicyGuard } from "#modules/billing/presentation/guards/policy.guard";
import { ErrorReportingModule } from "#modules/error-reporting/error-reporting.module";
import { HealthModule } from "#modules/health/health.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { OnboardingModule } from "#modules/onboarding/onboarding.module";
import { OrganizationSettingsModule } from "#modules/organization-settings/organization-settings.module";
import { ReportingModule } from "#modules/reporting/reporting.module";
import { RoleModule } from "#modules/role/role.module";
import { SecuritySettingsModule } from "#modules/security-settings/security-settings.module";
import { TeamModule } from "#modules/team/team.module";
import { UploadModule } from "#modules/upload/upload.module";
import { WebhookModule } from "#modules/webhook/webhook.module";
import { CryptoModule } from "#shared/crypto/crypto.module";
import { PrismaModule } from "#shared/database/prisma.module";
import { TenantContextModule } from "#shared/database/tenant-context";
import { EmailModule } from "#shared/email/email.module";
import { DomainEventBusModule } from "#shared/events/domain-event.bus";
import { GlobalExceptionFilter } from "#shared/filters/global-exception.filter";
import { AuditInterceptor } from "#shared/interceptors/audit.interceptor";
import { OrgContextInterceptor } from "#shared/interceptors/org-context.interceptor";
import { CorrelationIdMiddleware } from "#shared/logger/correlation-id.middleware";
import { LoggerModule } from "#shared/logger/logger.module";
import { LookupModule } from "#shared/lookups/lookup.module";
import { MetricsInterceptor } from "#shared/metrics/metrics.interceptor";
import { MetricsModule } from "#shared/metrics/metrics.module";
import { apiRateLimitBlockMs, apiRateLimitPerTenant, apiRateLimitTtlMs } from "#shared/rate-limit/rate-limit.config";
import { TenantThrottlerGuard } from "#shared/rate-limit/tenant-throttler.guard";
import { SavedViewModule } from "#shared/saved-views/saved-view.module";
import { StorageModule } from "#shared/storage/storage.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),
		ThrottlerModule.forRoot({
			throttlers: [
				{
					ttl: apiRateLimitTtlMs(),
					limit: apiRateLimitPerTenant(),
					blockDuration: apiRateLimitBlockMs(),
				},
			],
		}),
		LoggerModule,
		EmailModule,
		EventEmitterModule.forRoot(),
		DomainEventBusModule,
		ScheduleModule.forRoot(),
		CryptoModule,
		PrismaModule,
		TenantContextModule,
		MetricsModule,
		StorageModule,
		LookupModule,
		SavedViewModule,
		HealthModule,
		AuthModule,
		AdminModule,
		NotificationModule,
		OnboardingModule,
		ReportingModule,
		OrganizationSettingsModule,
		SecuritySettingsModule,
		ApiKeyModule,
		AuditLogModule,
		BillingModule,
		RoleModule,
		TeamModule,
		UploadModule,
		WebhookModule,
		ErrorReportingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: TenantThrottlerGuard },
		{ provide: APP_GUARD, useClass: SubscriptionStateGuard },
		{ provide: APP_GUARD, useClass: PolicyGuard },
		{ provide: APP_INTERCEPTOR, useClass: OrgContextInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware).forRoutes("*");
	}
}

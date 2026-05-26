import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "#modules/admin/admin.module";
import { ApiKeyModule } from "#modules/api-key/api-key.module";
import { AuditLogModule } from "#modules/audit-log/audit-log.module";
import { AuthModule } from "#modules/auth/auth.module";
import { BillingModule } from "#modules/billing/billing.module";
import { SubscriptionStateGuard } from "#modules/billing/guards/subscription-state.guard";
import { EimsModule } from "#modules/eims/eims.module";
import { ErrorReportingModule } from "#modules/error-reporting/error-reporting.module";
import { HealthModule } from "#modules/health/health.module";
import { InvoicingModule } from "#modules/invoicing/invoicing.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { OrganizationSettingsModule } from "#modules/organization-settings/organization-settings.module";
import { ReportingModule } from "#modules/reporting/reporting.module";
import { RoleModule } from "#modules/role/role.module";
import { SecuritySettingsModule } from "#modules/security-settings/security-settings.module";
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
import { SavedViewModule } from "#shared/saved-views/saved-view.module";
import { StorageModule } from "#shared/storage/storage.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),
		ThrottlerModule.forRoot({
			throttlers: [{ ttl: 60_000, limit: 60 }],
		}),
		LoggerModule,
		EmailModule,
		EventEmitterModule.forRoot(),
		DomainEventBusModule,
		ScheduleModule.forRoot(),
		PrismaModule,
		TenantContextModule,
		StorageModule,
		LookupModule,
		SavedViewModule,
		HealthModule,
		AuthModule,
		AdminModule,
		NotificationModule,
		ReportingModule,
		OrganizationSettingsModule,
		SecuritySettingsModule,
		ApiKeyModule,
		AuditLogModule,
		BillingModule,
		InvoicingModule,
		EimsModule,
		RoleModule,
		ErrorReportingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		{ provide: APP_GUARD, useClass: SubscriptionStateGuard },
		{ provide: APP_INTERCEPTOR, useClass: OrgContextInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware).forRoutes("*");
	}
}

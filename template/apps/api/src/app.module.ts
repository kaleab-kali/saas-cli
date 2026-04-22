import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "#modules/auth/auth.module";
import { CrmModule } from "#modules/crm/crm.module";
import { ErrorReportingModule } from "#modules/error-reporting/error-reporting.module";
import { FinanceModule } from "#modules/finance/finance.module";
import { HealthModule } from "#modules/health/health.module";
import { LeaseModule } from "#modules/lease/lease.module";
import { MaintenanceModule } from "#modules/maintenance/maintenance.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { ProcurementModule } from "#modules/procurement/procurement.module";
import { PropertyModule } from "#modules/property/property.module";
import { ReportingModule } from "#modules/reporting/reporting.module";
import { SalesModule } from "#modules/sales/sales.module";
import { PrismaModule } from "#shared/database/prisma.module";
import { GlobalExceptionFilter } from "#shared/filters/global-exception.filter";
import { AuditInterceptor } from "#shared/interceptors/audit.interceptor";
import { CorrelationIdMiddleware } from "#shared/logger/correlation-id.middleware";
import { LoggerModule } from "#shared/logger/logger.module";

@Module({
	imports: [
		// Config — loads .env
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),

		// Rate limiting — 60 requests per minute per IP
		ThrottlerModule.forRoot({
			throttlers: [{ ttl: 60_000, limit: 60 }],
		}),

		// Logging (Pino)
		LoggerModule,

		// Domain events
		EventEmitterModule.forRoot(),

		// Database
		PrismaModule,

		// Health check
		HealthModule,

		// Auth (Better Auth)
		AuthModule,

		// Feature modules
		PropertyModule,
		LeaseModule,
		MaintenanceModule,
		CrmModule,
		SalesModule,
		ProcurementModule,
		FinanceModule,
		NotificationModule,
		ReportingModule,

		// Error reporting (frontend error ingestion)
		ErrorReportingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(CorrelationIdMiddleware).forRoutes("*");
	}
}

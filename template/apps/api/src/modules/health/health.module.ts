import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { MetricsModule } from "#shared/metrics/metrics.module";
import { DetailedHealthController } from "./detailed-health.controller";
import { HealthController } from "./health.controller";
import { HealthDiagnosticsService } from "./health-diagnostics.service";

@Module({
	imports: [TerminusModule, MetricsModule],
	controllers: [HealthController, DetailedHealthController],
	providers: [HealthDiagnosticsService, SuperAdminGuard],
})
export class HealthModule {}

import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "#modules/auth/auth.module";
import { NotificationModule } from "#modules/notification/notification.module";
import { CancelScheduleHandler } from "./application/commands/cancel-schedule/cancel-schedule.handler";
import { CreateReportHandler } from "./application/commands/create-report/create-report.handler";
import { DeleteReportHandler } from "./application/commands/delete-report/delete-report.handler";
import { ExecuteReportHandler } from "./application/commands/execute-report/execute-report.handler";
import { ScheduleReportHandler } from "./application/commands/schedule-report/schedule-report.handler";
import { UpdateReportHandler } from "./application/commands/update-report/update-report.handler";
import { AllowedFieldsHandler } from "./application/queries/allowed-fields.handler";
import { GetReportHandler } from "./application/queries/get-report.handler";
import { ListExecutionsHandler } from "./application/queries/list-executions.handler";
import { ListReportsHandler } from "./application/queries/list-reports.handler";
import { ListSchedulesHandler } from "./application/queries/list-schedules.handler";
import { DashboardService } from "./application/services/dashboard.service";
import { DashboardExportService } from "./application/services/dashboard-export.service";
import { ReportExecutorService } from "./application/services/report-executor.service";
import { ScheduledDeliveryService } from "./application/services/scheduled-delivery.service";
import { ReportExecutionRepository } from "./domain/repositories/report-execution.repository";
import { ReportScheduleRepository } from "./domain/repositories/report-schedule.repository";
import { SavedReportRepository } from "./domain/repositories/saved-report.repository";
import { ReportSpecService } from "./domain/services/report-spec.service";
import { CsvExporter } from "./infrastructure/exporters/csv.exporter";
import { PdfExporter } from "./infrastructure/exporters/pdf.exporter";
import { XlsxExporter } from "./infrastructure/exporters/xlsx.exporter";
import { PrismaReportExecutionRepository } from "./infrastructure/repositories/prisma-report-execution.repository";
import { PrismaReportScheduleRepository } from "./infrastructure/repositories/prisma-report-schedule.repository";
import { PrismaSavedReportRepository } from "./infrastructure/repositories/prisma-saved-report.repository";
import { DashboardController } from "./presentation/controllers/dashboard.controller";
import { ExecutionController } from "./presentation/controllers/execution.controller";
import { ReportController } from "./presentation/controllers/report.controller";
import { ScheduleController } from "./presentation/controllers/schedule.controller";

@Module({
	imports: [AuthModule, NotificationModule, ScheduleModule.forRoot()],
	controllers: [ReportController, ScheduleController, ExecutionController, DashboardController],
	providers: [
		{ provide: SavedReportRepository, useClass: PrismaSavedReportRepository },
		{ provide: ReportScheduleRepository, useClass: PrismaReportScheduleRepository },
		{ provide: ReportExecutionRepository, useClass: PrismaReportExecutionRepository },
		ReportSpecService,
		ReportExecutorService,
		DashboardService,
		DashboardExportService,
		CsvExporter,
		XlsxExporter,
		PdfExporter,
		CreateReportHandler,
		UpdateReportHandler,
		DeleteReportHandler,
		ExecuteReportHandler,
		ScheduleReportHandler,
		CancelScheduleHandler,
		ListReportsHandler,
		GetReportHandler,
		ListSchedulesHandler,
		ListExecutionsHandler,
		AllowedFieldsHandler,
		ScheduledDeliveryService,
	],
})
export class ReportingModule {}

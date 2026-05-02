import { Global, Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { ListAuditLogsHandler } from "./application/queries/list-audit-logs.handler";
import { AuditExporterService } from "./application/services/audit-exporter.service";
import { AuditPersistenceService } from "./application/services/audit-persistence.service";
import { AuditLogRepository } from "./domain/repositories/audit-log.repository";
import { PrismaAuditLogRepository } from "./infrastructure/repositories/prisma-audit-log.repository";
import { AuditLogController } from "./presentation/controllers/audit-log.controller";

@Global()
@Module({
	imports: [AuthModule],
	controllers: [AuditLogController],
	providers: [
		{ provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
		AuditPersistenceService,
		AuditExporterService,
		ListAuditLogsHandler,
	],
	exports: [AuditPersistenceService],
})
export class AuditLogModule {}

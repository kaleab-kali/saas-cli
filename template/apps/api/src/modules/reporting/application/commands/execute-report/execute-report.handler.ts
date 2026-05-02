import { Injectable, NotFoundException } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { ReportExecution } from "../../../domain/entities/report-execution.entity";
import { REPORTING_EVENTS } from "../../../domain/events/reporting.events";
import { ReportExecutionRepository } from "../../../domain/repositories/report-execution.repository";
import { SavedReportRepository } from "../../../domain/repositories/saved-report.repository";
import type { ExportFormat } from "../../../domain/value-objects/report.vo";
import { CsvExporter } from "../../../infrastructure/exporters/csv.exporter";
import { PdfExporter } from "../../../infrastructure/exporters/pdf.exporter";
import { XlsxExporter } from "../../../infrastructure/exporters/xlsx.exporter";
import { ReportExecutorService } from "../../services/report-executor.service";

@Injectable()
export class ExecuteReportHandler {
	constructor(
		private readonly reports: SavedReportRepository,
		private readonly executor: ReportExecutorService,
		private readonly executionRepo: ReportExecutionRepository,
		private readonly csv: CsvExporter,
		private readonly xlsx: XlsxExporter,
		private readonly pdf: PdfExporter,
		private readonly events: DomainEventBus,
	) {}

	async execute(
		organizationId: string,
		reportId: string,
		format: ExportFormat | null,
		userId: string | null,
		triggeredBy: "manual" | "scheduled" = "manual",
	): Promise<{
		headers: string[];
		rows: Record<string, unknown>[];
		file?: Buffer;
		mimeType?: string;
		filename?: string;
	}> {
		const report = await this.reports.findById(organizationId, reportId);
		if (!report) throw new NotFoundException("Report not found");
		const started = Date.now();

		const exec = ReportExecution.create({
			id: createId(),
			organizationId,
			reportId,
			triggeredBy,
			triggeredUserId: userId,
			status: "pending",
			rowCount: 0,
			durationMs: null,
			error: null,
			format: format ?? null,
			emailedTo: [],
			createdAt: new Date(),
			completedAt: null,
		});
		await this.executionRepo.save(exec);
		exec.start();
		await this.executionRepo.update(organizationId, exec.id, exec);

		try {
			const result = await this.executor.execute(organizationId, report);
			const duration = Date.now() - started;
			exec.complete(result.rows.length, duration);
			await this.executionRepo.update(organizationId, exec.id, exec);

			this.events.emit({
				eventName: REPORTING_EVENTS.REPORT_EXECUTED,
				organizationId,
				payload: { reportId, executionId: exec.id, rowCount: result.rows.length, durationMs: duration },
			});

			if (!format) return { headers: result.headers, rows: result.rows };

			const name = report.toPrimitives().name;
			if (format === "csv") {
				return {
					headers: result.headers,
					rows: result.rows,
					file: this.csv.build(result.headers, result.rows),
					mimeType: "text/csv; charset=utf-8",
					filename: `${name}.csv`,
				};
			}
			if (format === "xlsx") {
				const buf = await this.xlsx.build(name, result.headers, result.rows);
				return {
					headers: result.headers,
					rows: result.rows,
					file: buf,
					mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					filename: `${name}.xlsx`,
				};
			}
			if (format === "pdf") {
				const buf = await this.pdf.build(name, result.headers, result.rows);
				return {
					headers: result.headers,
					rows: result.rows,
					file: buf,
					mimeType: "application/pdf",
					filename: `${name}.pdf`,
				};
			}
			return { headers: result.headers, rows: result.rows };
		} catch (e) {
			const duration = Date.now() - started;
			exec.fail((e as Error).message, duration);
			await this.executionRepo.update(organizationId, exec.id, exec);
			this.events.emit({
				eventName: REPORTING_EVENTS.REPORT_FAILED,
				organizationId,
				payload: { reportId, error: (e as Error).message },
			});
			throw e;
		}
	}
}

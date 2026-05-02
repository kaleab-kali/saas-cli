import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BulkCommunicationRepository } from "../../domain/repositories/bulk-communication.repository";
import { SendBulkHandler } from "../commands/send-bulk/send-bulk.handler";

@Injectable()
export class ScheduledBulkService {
	private readonly logger = new Logger(ScheduledBulkService.name);

	constructor(
		private readonly repo: BulkCommunicationRepository,
		private readonly send: SendBulkHandler,
	) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async processScheduled() {
		const due = await this.repo.listDueScheduled();
		for (const b of due) {
			const p = b.toPrimitives();
			try {
				await this.send.execute(p.organizationId, p.id);
				this.logger.log(`Sent scheduled bulk ${p.id}`);
			} catch (e) {
				this.logger.error(`Scheduled bulk ${p.id} failed: ${(e as Error).message}`);
			}
		}
	}
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { BulkCommunicationRepository } from "../../../domain/repositories/bulk-communication.repository";
import { AudienceResolver } from "../../../domain/services/audience-resolver.service";
import { EmailDispatcherService } from "../../services/email-dispatcher.service";

@Injectable()
export class SendBulkHandler {
	constructor(
		private readonly repo: BulkCommunicationRepository,
		private readonly audienceResolver: AudienceResolver,
		private readonly dispatcher: EmailDispatcherService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const bulk = await this.repo.findById(organizationId, id);
		if (!bulk) throw new NotFoundException("Bulk communication not found");
		const p = bulk.toPrimitives();
		const recipients = await this.audienceResolver.resolve(organizationId, p.audienceType, p.audienceRef);
		if (recipients.length === 0) throw new BadRequestException("No recipients resolved for audience");
		bulk.startSending(recipients.length);
		await this.repo.update(organizationId, id, bulk);
		try {
			const stats = await this.dispatcher.dispatchMany(
				recipients.map((r) => ({
					organizationId,
					to: r.email,
					subject: p.subject,
					html: p.bodyHtml.replace(/\{\{name\}\}/g, r.name),
					source: "bulk" as const,
					sourceRef: id,
				})),
			);
			bulk.markSent(stats);
			const saved = await this.repo.update(organizationId, id, bulk);
			this.events.emit({
				eventName: NOTIFICATION_EVENTS.BULK_SENT,
				organizationId,
				payload: { bulkId: id, stats },
			});
			return saved.toPrimitives();
		} catch (e) {
			bulk.markFailed((e as Error).message);
			await this.repo.update(organizationId, id, bulk);
			this.events.emit({
				eventName: NOTIFICATION_EVENTS.BULK_FAILED,
				organizationId,
				payload: { bulkId: id, reason: (e as Error).message },
			});
			throw e;
		}
	}
}

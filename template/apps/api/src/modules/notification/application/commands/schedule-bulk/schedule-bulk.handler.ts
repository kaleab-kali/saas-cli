import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { BulkCommunicationRepository } from "../../../domain/repositories/bulk-communication.repository";

@Injectable()
export class ScheduleBulkHandler {
	constructor(
		private readonly repo: BulkCommunicationRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string, scheduledAt: string) {
		const bulk = await this.repo.findById(organizationId, id);
		if (!bulk) throw new NotFoundException("Bulk communication not found");
		bulk.schedule(new Date(scheduledAt));
		const saved = await this.repo.update(organizationId, id, bulk);
		this.events.emit({
			eventName: NOTIFICATION_EVENTS.BULK_SCHEDULED,
			organizationId,
			payload: { bulkId: id, scheduledAt },
		});
		return saved.toPrimitives();
	}
}

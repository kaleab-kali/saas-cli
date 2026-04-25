import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { NotificationRepository } from "../../../domain/repositories/notification.repository";

@Injectable()
export class ArchiveNotificationHandler {
	constructor(
		private readonly repo: NotificationRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const n = await this.repo.findById(organizationId, id);
		if (!n) throw new NotFoundException("Notification not found");
		n.archive();
		const saved = await this.repo.update(organizationId, id, n);
		this.events.emit({
			eventName: NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED,
			organizationId,
			payload: { notificationId: id },
		});
		return saved.toPrimitives();
	}
}

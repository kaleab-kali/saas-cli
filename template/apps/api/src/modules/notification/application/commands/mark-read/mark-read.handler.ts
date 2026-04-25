import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { NotificationRepository } from "../../../domain/repositories/notification.repository";
import { NotificationGateway } from "../../../infrastructure/gateways/notification.gateway";

@Injectable()
export class MarkReadHandler {
	constructor(
		private readonly repo: NotificationRepository,
		private readonly events: DomainEventBus,
		private readonly gateway: NotificationGateway,
	) {}

	async execute(organizationId: string, id: string) {
		const n = await this.repo.findById(organizationId, id);
		if (!n) throw new NotFoundException("Notification not found");
		n.markRead();
		const saved = await this.repo.update(organizationId, id, n);
		const { unread } = await this.repo.list({ organizationId, userId: n.userId, limit: 1 });
		this.gateway.emitBadgeCount(n.userId, unread);
		this.events.emit({
			eventName: NOTIFICATION_EVENTS.NOTIFICATION_READ,
			organizationId,
			payload: { notificationId: id, userId: n.userId },
		});
		return saved.toPrimitives();
	}
}

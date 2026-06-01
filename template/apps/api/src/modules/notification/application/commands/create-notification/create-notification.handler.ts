import { Injectable } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { createId } from "#shared/lib/id";
import { Notification } from "../../../domain/entities/notification.entity";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { NotificationRepository } from "../../../domain/repositories/notification.repository";
import type { NotificationCategory, NotificationSeverity } from "../../../domain/value-objects/notification.vo";
import { NotificationGateway } from "../../../infrastructure/gateways/notification.gateway";
import type { CreateNotificationDto } from "../../dto/notification.dto";
import { NotificationStreamService } from "../../services/notification-stream.service";

@Injectable()
export class CreateNotificationHandler {
	constructor(
		private readonly repo: NotificationRepository,
		private readonly events: DomainEventBus,
		private readonly gateway: NotificationGateway,
		private readonly stream: NotificationStreamService,
	) {}

	async execute(organizationId: string, dto: CreateNotificationDto) {
		const now = new Date();
		const notification = Notification.create({
			id: createId(),
			organizationId,
			userId: dto.userId,
			category: dto.category as NotificationCategory,
			severity: (dto.severity ?? "info") as NotificationSeverity,
			title: dto.title,
			body: dto.body ?? null,
			linkUrl: dto.linkUrl ?? null,
			sourceEvent: dto.sourceEvent ?? null,
			sourceRef: dto.sourceRef ?? null,
			read: false,
			readAt: null,
			archivedAt: null,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.repo.save(notification);
		this.gateway.emitToUser(dto.userId, saved.toPrimitives());
		this.stream.emitToUser(dto.userId, saved.toPrimitives());
		const { unread } = await this.repo.list({ organizationId, userId: dto.userId, limit: 1 });
		this.gateway.emitBadgeCount(dto.userId, unread);
		this.stream.emitBadgeCount(dto.userId, unread);
		this.events.emit({
			eventName: NOTIFICATION_EVENTS.NOTIFICATION_CREATED,
			organizationId,
			payload: { notificationId: saved.id, userId: dto.userId, category: dto.category },
		});
		return saved.toPrimitives();
	}
}

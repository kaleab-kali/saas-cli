import { Injectable } from "@nestjs/common";
import { NotificationRepository } from "../../../domain/repositories/notification.repository";
import { NotificationGateway } from "../../../infrastructure/gateways/notification.gateway";
import { NotificationStreamService } from "../../services/notification-stream.service";

@Injectable()
export class MarkAllReadHandler {
	constructor(
		private readonly repo: NotificationRepository,
		private readonly gateway: NotificationGateway,
		private readonly stream: NotificationStreamService,
	) {}

	async execute(organizationId: string, userId: string) {
		const count = await this.repo.markAllRead(organizationId, userId);
		this.gateway.emitBadgeCount(userId, 0);
		this.stream.emitBadgeCount(userId, 0);
		return { updated: count };
	}
}

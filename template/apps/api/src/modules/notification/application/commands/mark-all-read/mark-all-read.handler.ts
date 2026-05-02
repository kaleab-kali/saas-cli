import { Injectable } from "@nestjs/common";
import { NotificationRepository } from "../../../domain/repositories/notification.repository";
import { NotificationGateway } from "../../../infrastructure/gateways/notification.gateway";

@Injectable()
export class MarkAllReadHandler {
	constructor(
		private readonly repo: NotificationRepository,
		private readonly gateway: NotificationGateway,
	) {}

	async execute(organizationId: string, userId: string) {
		const count = await this.repo.markAllRead(organizationId, userId);
		this.gateway.emitBadgeCount(userId, 0);
		return { updated: count };
	}
}

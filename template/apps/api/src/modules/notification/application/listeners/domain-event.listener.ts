import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "#shared/database/prisma.service";
import type { NotificationCategory, NotificationSeverity } from "../../domain/value-objects/notification.vo";
import { CreateNotificationHandler } from "../commands/create-notification/create-notification.handler";

interface GenericNotificationEvent {
	organizationId: string;
	category?: NotificationCategory;
	severity?: NotificationSeverity;
	title: string;
	body?: string;
	linkUrl?: string;
	sourceEvent?: string;
	sourceRef?: string;
}

@Injectable()
export class DomainEventListener {
	private readonly logger = new Logger(DomainEventListener.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly createNotification: CreateNotificationHandler,
	) {}

	@OnEvent("app.notification")
	async notifyAdmins(event: GenericNotificationEvent) {
		const members = await this.prisma.member.findMany({
			where: {
				organizationId: event.organizationId,
				role: { in: ["owner", "admin"] },
			},
			select: { userId: true },
		});

		for (const member of members) {
			try {
				await this.createNotification.execute(event.organizationId, {
					userId: member.userId,
					category: event.category ?? "system",
					severity: event.severity ?? "info",
					title: event.title,
					body: event.body,
					linkUrl: event.linkUrl,
					sourceEvent: event.sourceEvent ?? "app.notification",
					sourceRef: event.sourceRef,
				});
			} catch (error) {
				this.logger.warn(`Notification dispatch failed: ${(error as Error).message}`);
			}
		}
	}
}

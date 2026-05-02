import { Notification, type NotificationProps } from "../../domain/entities/notification.entity";
import type { NotificationCategory, NotificationSeverity } from "../../domain/value-objects/notification.vo";

export interface NotificationRow {
	id: string;
	organizationId: string;
	userId: string;
	category: string;
	severity: string;
	title: string;
	body: string | null;
	linkUrl: string | null;
	sourceEvent: string | null;
	sourceRef: string | null;
	read: boolean;
	readAt: Date | null;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export const NotificationMapper = {
	toDomain(row: NotificationRow): Notification {
		const props: NotificationProps = {
			...row,
			category: row.category as NotificationCategory,
			severity: row.severity as NotificationSeverity,
		};
		return Notification.rehydrate(props);
	},

	toPersistence(n: Notification) {
		const p = n.toPrimitives();
		return {
			id: p.id,
			organizationId: p.organizationId,
			userId: p.userId,
			category: p.category,
			severity: p.severity,
			title: p.title,
			body: p.body,
			linkUrl: p.linkUrl,
			sourceEvent: p.sourceEvent,
			sourceRef: p.sourceRef,
			read: p.read,
			readAt: p.readAt,
			archivedAt: p.archivedAt,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		};
	},

	toDto(n: Notification) {
		return n.toPrimitives();
	},
};

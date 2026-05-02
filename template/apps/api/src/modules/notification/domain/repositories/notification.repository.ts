import type { Notification } from "../entities/notification.entity";

export interface NotificationFilter {
	organizationId: string;
	userId?: string;
	category?: string;
	read?: boolean;
	includeArchived?: boolean;
	page?: number;
	limit?: number;
}

export abstract class NotificationRepository {
	abstract findById(organizationId: string, id: string): Promise<Notification | null>;
	abstract list(filter: NotificationFilter): Promise<{ data: Notification[]; total: number; unread: number }>;
	abstract save(n: Notification): Promise<Notification>;
	abstract saveMany(notifications: Notification[]): Promise<void>;
	abstract update(organizationId: string, id: string, n: Notification): Promise<Notification>;
	abstract markAllRead(organizationId: string, userId: string): Promise<number>;
}

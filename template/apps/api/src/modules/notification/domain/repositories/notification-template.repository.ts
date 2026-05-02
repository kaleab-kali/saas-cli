import type { NotificationTemplate } from "../entities/notification-template.entity";

export abstract class NotificationTemplateRepository {
	abstract findById(organizationId: string, id: string): Promise<NotificationTemplate | null>;
	abstract findByEventKey(organizationId: string, eventKey: string): Promise<NotificationTemplate | null>;
	abstract list(organizationId: string): Promise<NotificationTemplate[]>;
	abstract save(template: NotificationTemplate): Promise<NotificationTemplate>;
	abstract update(organizationId: string, id: string, template: NotificationTemplate): Promise<NotificationTemplate>;
	abstract delete(organizationId: string, id: string): Promise<void>;
}

import { NotificationTemplate, type TemplateProps } from "../../domain/entities/notification-template.entity";

export interface TemplateRow {
	id: string;
	organizationId: string;
	eventKey: string;
	subject: string;
	bodyHtml: string;
	bodyText: string | null;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const NotificationTemplateMapper = {
	toDomain(row: TemplateRow): NotificationTemplate {
		const props: TemplateProps = { ...row };
		return NotificationTemplate.rehydrate(props);
	},

	toPersistence(t: NotificationTemplate) {
		return { ...t.toPrimitives() };
	},

	toDto(t: NotificationTemplate) {
		return t.toPrimitives();
	},
};

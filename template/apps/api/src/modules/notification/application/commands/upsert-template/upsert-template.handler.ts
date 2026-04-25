import { Injectable } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { NotificationTemplate } from "../../../domain/entities/notification-template.entity";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { NotificationTemplateRepository } from "../../../domain/repositories/notification-template.repository";
import type { UpsertTemplateDto } from "../../dto/template.dto";

@Injectable()
export class UpsertTemplateHandler {
	constructor(
		private readonly repo: NotificationTemplateRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, dto: UpsertTemplateDto) {
		const existing = await this.repo.findByEventKey(organizationId, dto.eventKey);
		if (existing) {
			existing.update({
				subject: dto.subject,
				bodyHtml: dto.bodyHtml,
				bodyText: dto.bodyText ?? null,
				active: dto.active,
			});
			const saved = await this.repo.update(organizationId, existing.id, existing);
			this.events.emit({
				eventName: NOTIFICATION_EVENTS.TEMPLATE_UPSERTED,
				organizationId,
				payload: { eventKey: dto.eventKey, templateId: saved.id },
			});
			return saved.toPrimitives();
		}
		const now = new Date();
		const t = NotificationTemplate.create({
			id: createId(),
			organizationId,
			eventKey: dto.eventKey,
			subject: dto.subject,
			bodyHtml: dto.bodyHtml,
			bodyText: dto.bodyText ?? null,
			active: dto.active ?? true,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.repo.save(t);
		this.events.emit({
			eventName: NOTIFICATION_EVENTS.TEMPLATE_UPSERTED,
			organizationId,
			payload: { eventKey: dto.eventKey, templateId: saved.id },
		});
		return saved.toPrimitives();
	}
}

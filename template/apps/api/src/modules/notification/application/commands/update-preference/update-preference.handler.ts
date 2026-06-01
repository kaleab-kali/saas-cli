import { Injectable } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { createId } from "#shared/lib/id";
import { NotificationPreference } from "../../../domain/entities/notification-preference.entity";
import { NOTIFICATION_EVENTS } from "../../../domain/events/notification.events";
import { NotificationPreferenceRepository } from "../../../domain/repositories/notification-preference.repository";
import type { EmailFrequency } from "../../../domain/value-objects/notification.vo";
import type { UpsertPreferenceDto } from "../../dto/notification.dto";

@Injectable()
export class UpdatePreferenceHandler {
	constructor(
		private readonly repo: NotificationPreferenceRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, userId: string, dto: UpsertPreferenceDto) {
		const existing = await this.repo.findByUserAndEvent(organizationId, userId, dto.eventKey);
		if (existing) {
			existing.setChannels({ inApp: dto.inApp, email: dto.email, sms: dto.sms });
			const saved = await this.repo.update(organizationId, existing.id, existing);
			this.events.emit({
				eventName: NOTIFICATION_EVENTS.PREFERENCE_UPDATED,
				organizationId,
				payload: { userId, eventKey: dto.eventKey },
			});
			return saved.toPrimitives();
		}
		const now = new Date();
		const pref = NotificationPreference.create({
			id: createId(),
			organizationId,
			userId,
			eventKey: dto.eventKey,
			inApp: dto.inApp ?? true,
			email: (dto.email as EmailFrequency) ?? "instant",
			sms: dto.sms ?? false,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.repo.save(pref);
		return saved.toPrimitives();
	}
}

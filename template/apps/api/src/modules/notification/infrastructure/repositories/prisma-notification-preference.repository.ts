import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { NotificationPreference } from "../../domain/entities/notification-preference.entity";
import { NotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";
import { NotificationPreferenceMapper } from "../mappers/notification-preference.mapper";

@Injectable()
export class PrismaNotificationPreferenceRepository extends NotificationPreferenceRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByUserAndEvent(organizationId: string, userId: string, eventKey: string) {
		const row = await this.prisma.notificationPreference.findFirst({
			where: { organizationId, userId, eventKey },
		});
		return row ? NotificationPreferenceMapper.toDomain(row) : null;
	}

	async listForUser(organizationId: string, userId: string) {
		const rows = await this.prisma.notificationPreference.findMany({
			where: { organizationId, userId },
			orderBy: { eventKey: "asc" },
		});
		return rows.map((r) => NotificationPreferenceMapper.toDomain(r));
	}

	async save(pref: NotificationPreference) {
		const row = await this.prisma.notificationPreference.create({
			data: NotificationPreferenceMapper.toPersistence(pref),
		});
		return NotificationPreferenceMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, pref: NotificationPreference) {
		const p = NotificationPreferenceMapper.toPersistence(pref);
		const row = await this.prisma.notificationPreference.update({
			where: { id },
			data: { inApp: p.inApp, email: p.email, sms: p.sms, updatedAt: p.updatedAt },
		});
		return NotificationPreferenceMapper.toDomain(row);
	}
}

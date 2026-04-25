import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { NotificationTemplate } from "../../domain/entities/notification-template.entity";
import { NotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";
import { NotificationTemplateMapper } from "../mappers/notification-template.mapper";

@Injectable()
export class PrismaNotificationTemplateRepository extends NotificationTemplateRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.notificationTemplate.findFirst({ where: { id, organizationId } });
		return row ? NotificationTemplateMapper.toDomain(row) : null;
	}

	async findByEventKey(organizationId: string, eventKey: string) {
		const row = await this.prisma.notificationTemplate.findFirst({
			where: { organizationId, eventKey, active: true },
		});
		return row ? NotificationTemplateMapper.toDomain(row) : null;
	}

	async list(organizationId: string) {
		const rows = await this.prisma.notificationTemplate.findMany({
			where: { organizationId },
			orderBy: { eventKey: "asc" },
		});
		return rows.map((r) => NotificationTemplateMapper.toDomain(r));
	}

	async save(t: NotificationTemplate) {
		const row = await this.prisma.notificationTemplate.create({
			data: NotificationTemplateMapper.toPersistence(t),
		});
		return NotificationTemplateMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, t: NotificationTemplate) {
		const p = NotificationTemplateMapper.toPersistence(t);
		const row = await this.prisma.notificationTemplate.update({
			where: { id },
			data: {
				subject: p.subject,
				bodyHtml: p.bodyHtml,
				bodyText: p.bodyText,
				active: p.active,
				updatedAt: p.updatedAt,
			},
		});
		return NotificationTemplateMapper.toDomain(row);
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.prisma.notificationTemplate.deleteMany({ where: { id, organizationId } });
	}
}

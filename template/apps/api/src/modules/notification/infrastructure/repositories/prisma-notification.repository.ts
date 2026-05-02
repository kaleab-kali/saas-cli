import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Notification } from "../../domain/entities/notification.entity";
import { type NotificationFilter, NotificationRepository } from "../../domain/repositories/notification.repository";
import { NotificationMapper } from "../mappers/notification.mapper";

@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.notification.findFirst({ where: { id, organizationId } });
		return row ? NotificationMapper.toDomain(row) : null;
	}

	async list(f: NotificationFilter) {
		const page = Math.max(1, f.page ?? 1);
		const limit = Math.min(100, f.limit ?? 20);
		const where = {
			organizationId: f.organizationId,
			...(f.userId ? { userId: f.userId } : {}),
			...(f.category ? { category: f.category } : {}),
			...(f.read !== undefined ? { read: f.read } : {}),
			...(f.includeArchived ? {} : { archivedAt: null }),
		};
		const [total, unread, rows] = await Promise.all([
			this.prisma.notification.count({ where }),
			this.prisma.notification.count({ where: { ...where, read: false } }),
			this.prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
		]);
		return {
			data: rows.map((r) => NotificationMapper.toDomain(r)),
			total,
			unread,
		};
	}

	async save(n: Notification) {
		const row = await this.prisma.notification.create({ data: NotificationMapper.toPersistence(n) });
		return NotificationMapper.toDomain(row);
	}

	async saveMany(notifications: Notification[]) {
		if (notifications.length === 0) return;
		await this.prisma.notification.createMany({
			data: notifications.map((n) => NotificationMapper.toPersistence(n)),
		});
	}

	async update(_organizationId: string, id: string, n: Notification) {
		const p = NotificationMapper.toPersistence(n);
		const row = await this.prisma.notification.update({
			where: { id },
			data: {
				read: p.read,
				readAt: p.readAt,
				archivedAt: p.archivedAt,
				updatedAt: p.updatedAt,
			},
		});
		return NotificationMapper.toDomain(row);
	}

	async markAllRead(organizationId: string, userId: string) {
		const now = new Date();
		const res = await this.prisma.notification.updateMany({
			where: { organizationId, userId, read: false },
			data: { read: true, readAt: now, updatedAt: now },
		});
		return res.count;
	}
}

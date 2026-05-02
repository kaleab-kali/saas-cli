import { Injectable } from "@nestjs/common";
import { type NotificationFilter, NotificationRepository } from "../../domain/repositories/notification.repository";

@Injectable()
export class ListNotificationsHandler {
	constructor(private readonly repo: NotificationRepository) {}

	async execute(filter: NotificationFilter) {
		const res = await this.repo.list(filter);
		const page = Math.max(1, filter.page ?? 1);
		const limit = Math.min(100, filter.limit ?? 20);
		return {
			data: res.data.map((n) => n.toPrimitives()),
			meta: {
				total: res.total,
				unread: res.unread,
				page,
				limit,
				totalPages: Math.ceil(res.total / limit) || 1,
			},
		};
	}
}

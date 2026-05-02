import { Injectable } from "@nestjs/common";
import { NotificationTemplateRepository } from "../../domain/repositories/notification-template.repository";

@Injectable()
export class ListTemplatesHandler {
	constructor(private readonly repo: NotificationTemplateRepository) {}

	async execute(organizationId: string) {
		const templates = await this.repo.list(organizationId);
		return templates.map((t) => t.toPrimitives());
	}
}

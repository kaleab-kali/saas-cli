import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationTemplateRepository } from "../../../domain/repositories/notification-template.repository";

@Injectable()
export class DeleteTemplateHandler {
	constructor(private readonly repo: NotificationTemplateRepository) {}

	async execute(organizationId: string, id: string) {
		const t = await this.repo.findById(organizationId, id);
		if (!t) throw new NotFoundException("Template not found");
		await this.repo.delete(organizationId, id);
	}
}

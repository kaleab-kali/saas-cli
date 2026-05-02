import { Injectable } from "@nestjs/common";
import { NotificationPreferenceRepository } from "../../domain/repositories/notification-preference.repository";

@Injectable()
export class ListPreferencesHandler {
	constructor(private readonly repo: NotificationPreferenceRepository) {}

	async execute(organizationId: string, userId: string) {
		const prefs = await this.repo.listForUser(organizationId, userId);
		return prefs.map((p) => p.toPrimitives());
	}
}

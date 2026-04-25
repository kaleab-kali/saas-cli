import { Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { API_KEY_EVENTS } from "../../../domain/events/api-key.events";
import { ApiKeyRepository } from "../../../domain/repositories/api-key.repository";

@Injectable()
export class RevokeApiKeyHandler {
	constructor(
		private readonly repo: ApiKeyRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const key = await this.repo.findById(organizationId, id);
		if (!key) throw new NotFoundException("api key not found");
		key.revoke();
		await this.repo.update(organizationId, id, key);
		this.events.emit({ eventName: API_KEY_EVENTS.REVOKED, organizationId, payload: { apiKeyId: id } });
		return key.toPublicDto();
	}
}

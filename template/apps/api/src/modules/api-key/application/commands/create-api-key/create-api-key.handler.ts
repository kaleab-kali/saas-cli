import { Injectable } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { ApiKey } from "../../../domain/entities/api-key.entity";
import { API_KEY_EVENTS } from "../../../domain/events/api-key.events";
import { ApiKeyRepository } from "../../../domain/repositories/api-key.repository";
import { ApiKeyHasherService } from "../../../domain/services/api-key-hasher.service";
import type { CreateApiKeyDto } from "../../dto/api-key.dto";

@Injectable()
export class CreateApiKeyHandler {
	constructor(
		private readonly repo: ApiKeyRepository,
		private readonly hasher: ApiKeyHasherService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, userId: string, dto: CreateApiKeyDto) {
		const { plain, hash, prefix } = this.hasher.generate();
		const entity = ApiKey.create({
			id: "",
			organizationId,
			name: dto.name,
			keyHash: hash,
			keyPrefix: prefix,
			scopes: dto.scopes,
			createdByUserId: userId,
			expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
			revokedAt: null,
			lastUsedAt: null,
			usageCount: 0,
			rateLimit: dto.rateLimit ?? null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const saved = await this.repo.save(entity);
		this.events.emit({
			eventName: API_KEY_EVENTS.CREATED,
			organizationId,
			payload: { apiKeyId: saved.id, name: dto.name },
		});
		// Return plain key once — caller must copy
		return { apiKey: saved.toPublicDto(), plainKey: plain };
	}
}

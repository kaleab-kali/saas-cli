import { Injectable } from "@nestjs/common";
import { ApiKeyRepository } from "../../domain/repositories/api-key.repository";

@Injectable()
export class ListApiKeysHandler {
	constructor(private readonly repo: ApiKeyRepository) {}

	async execute(organizationId: string, includeRevoked = false) {
		const keys = await this.repo.list(organizationId, includeRevoked);
		return keys.map((k) => k.toPublicDto());
	}
}

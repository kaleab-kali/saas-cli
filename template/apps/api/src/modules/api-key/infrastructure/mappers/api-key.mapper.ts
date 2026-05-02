import type { ApiKey as PrismaApiKey } from "../../../../generated/prisma/client";
import { ApiKey } from "../../domain/entities/api-key.entity";

export class ApiKeyMapper {
	static toDomain(row: PrismaApiKey): ApiKey {
		return ApiKey.rehydrate({
			id: row.id,
			organizationId: row.organizationId,
			name: row.name,
			keyHash: row.keyHash,
			keyPrefix: row.keyPrefix,
			scopes: row.scopes,
			createdByUserId: row.createdByUserId,
			expiresAt: row.expiresAt,
			revokedAt: row.revokedAt,
			lastUsedAt: row.lastUsedAt,
			usageCount: row.usageCount,
			rateLimit: row.rateLimit,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(entity: ApiKey) {
		return entity.toPublicDto();
	}
}

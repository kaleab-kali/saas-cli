import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { ApiKey } from "../../domain/entities/api-key.entity";
import { ApiKeyRepository } from "../../domain/repositories/api-key.repository";
import { ApiKeyMapper } from "../mappers/api-key.mapper";

@Injectable()
export class PrismaApiKeyRepository extends ApiKeyRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async list(organizationId: string, includeRevoked = false): Promise<ApiKey[]> {
		const rows = await this.prisma.apiKey.findMany({
			where: { organizationId, ...(includeRevoked ? {} : { revokedAt: null }) },
			orderBy: { createdAt: "desc" },
		});
		return rows.map(ApiKeyMapper.toDomain);
	}

	async findById(organizationId: string, id: string): Promise<ApiKey | null> {
		const row = await this.prisma.apiKey.findFirst({ where: { id, organizationId } });
		return row ? ApiKeyMapper.toDomain(row) : null;
	}

	async findByHash(hash: string): Promise<ApiKey | null> {
		const row = await this.prisma.apiKey.findUnique({ where: { keyHash: hash } });
		return row ? ApiKeyMapper.toDomain(row) : null;
	}

	async save(key: ApiKey): Promise<ApiKey> {
		const p = key.toPrimitives();
		const row = await this.prisma.apiKey.create({
			data: {
				organizationId: p.organizationId,
				name: p.name,
				keyHash: p.keyHash,
				keyPrefix: p.keyPrefix,
				scopes: p.scopes,
				createdByUserId: p.createdByUserId,
				expiresAt: p.expiresAt,
				rateLimit: p.rateLimit,
			},
		});
		return ApiKeyMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, key: ApiKey): Promise<ApiKey> {
		const p = key.toPrimitives();
		const row = await this.prisma.apiKey.update({
			where: { id },
			data: {
				revokedAt: p.revokedAt,
				lastUsedAt: p.lastUsedAt,
				usageCount: p.usageCount,
			},
		});
		return ApiKeyMapper.toDomain(row);
	}
}

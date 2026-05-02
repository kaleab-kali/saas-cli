import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ApiKeyRepository } from "../../domain/repositories/api-key.repository";
import { ApiKeyHasherService } from "../../domain/services/api-key-hasher.service";

// Alternate authentication strategy for programmatic access.
// Clients send header: X-API-Key: pf_<hex>
@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(
		private readonly repo: ApiKeyRepository,
		private readonly hasher: ApiKeyHasherService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request & { apiKeyId?: string; organizationId?: string }>();
		const header = req.header("x-api-key");
		if (!header) throw new UnauthorizedException("missing X-API-Key header");
		const hash = this.hasher.hash(header);
		const key = await this.repo.findByHash(hash);
		if (!key) throw new UnauthorizedException("invalid api key");
		if (!key.isActive) throw new UnauthorizedException("api key revoked or expired");
		key.recordUsage();
		await this.repo.update(key.organizationId, key.id, key);
		req.apiKeyId = key.id;
		req.organizationId = key.organizationId;
		return true;
	}
}

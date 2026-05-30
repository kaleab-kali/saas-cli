import {
	type CanActivate,
	type ExecutionContext,
	HttpException,
	HttpStatus,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "#shared/database/prisma.service";
import { ApiKeyRepository } from "../../domain/repositories/api-key.repository";
import { ApiKeyHasherService } from "../../domain/services/api-key-hasher.service";

// Alternate authentication strategy for programmatic access.
// Clients send header: X-API-Key: sk_<hex>
const WINDOW_MS = 60_000;
const buckets = new Map<string, { windowStart: number; hits: number }>();

@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(
		private readonly repo: ApiKeyRepository,
		private readonly hasher: ApiKeyHasherService,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request & { apiKeyId?: string; organizationId?: string }>();
		const header = req.header("x-api-key");
		if (!header) throw new UnauthorizedException("missing X-API-Key header");
		const hash = this.hasher.hash(header);
		const key = await this.repo.findByHash(hash);
		if (!key) throw new UnauthorizedException("invalid api key");
		if (!key.isActive) throw new UnauthorizedException("api key revoked or expired");
		await this.assertWithinRateLimit(key.id, key.organizationId, key.toPrimitives().rateLimit);
		key.recordUsage();
		await this.repo.update(key.organizationId, key.id, key);
		req.apiKeyId = key.id;
		req.organizationId = key.organizationId;
		return true;
	}

	private async assertWithinRateLimit(apiKeyId: string, organizationId: string, explicitLimit: number | null) {
		const limit = explicitLimit ?? (await this.planLimit(organizationId));
		if (!limit || limit <= 0) return;
		const now = Date.now();
		const bucket = buckets.get(apiKeyId);
		if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
			buckets.set(apiKeyId, { windowStart: now, hits: 1 });
			return;
		}
		if (bucket.hits >= limit) {
			throw new HttpException(`API key exceeded ${limit} requests per minute`, HttpStatus.TOO_MANY_REQUESTS);
		}
		bucket.hits += 1;
	}

	private async planLimit(organizationId: string): Promise<number | null> {
		const sub = await this.prisma.subscription.findUnique({
			where: { organizationId },
			select: {
				plan: {
					select: {
						entitlements: {
							where: { featureKey: "platform.api-requests-per-minute", enabled: true },
							select: { limit: true },
							take: 1,
						},
					},
				},
			},
		});
		return sub?.plan.entitlements[0]?.limit ?? null;
	}
}

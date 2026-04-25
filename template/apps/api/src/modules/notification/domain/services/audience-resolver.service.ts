import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { AudienceType } from "../value-objects/notification.vo";

export interface ResolvedRecipient {
	contactId?: string;
	userId?: string;
	email: string;
	name: string;
}

@Injectable()
export class AudienceResolver {
	constructor(private readonly prisma: PrismaService) {}

	// Skeleton: domain-aware audience resolution (renters, owners, building, segment)
	// is removed pending domain models. Override per-app once Contact/Lease etc. are added.
	async resolve(
		_organizationId: string,
		_audienceType: AudienceType,
		_audienceRef?: string | null,
	): Promise<ResolvedRecipient[]> {
		return [];
	}
}

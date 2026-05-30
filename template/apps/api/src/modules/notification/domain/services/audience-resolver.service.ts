import { Injectable } from "@nestjs/common";
import type { AudienceType } from "../value-objects/notification.vo";

export interface ResolvedRecipient {
	contactId?: string;
	userId?: string;
	email: string;
	name: string;
}

@Injectable()
export class AudienceResolver {
	// Skeleton: domain-aware audience resolution is intentionally empty.
	// Override per app once your own audience models are added.
	async resolve(
		_organizationId: string,
		_audienceType: AudienceType,
		_audienceRef?: string | null,
	): Promise<ResolvedRecipient[]> {
		return [];
	}
}

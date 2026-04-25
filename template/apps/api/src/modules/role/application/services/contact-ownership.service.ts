import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

export interface ContactAccessContext {
	organizationId: string;
	userId: string;
	roleSlugs: string[];
}

export interface ContactFilter {
	ownedByUserId?: string | null;
}

/**
 * ContactOwnershipService — skeleton.
 *
 * Originally gated CRM Contact PII visibility by role (owner/admin/agent/etc).
 * Stubbed for the create-vyllion-saas template (no Contact model). Replace with
 * your domain's ownership rules once Contact (or equivalent) is added.
 */
@Injectable()
export class ContactOwnershipService {
	constructor(private readonly _prisma: PrismaService) {}

	async computeListFilter(_ctx: ContactAccessContext): Promise<ContactFilter> {
		return {};
	}

	async assertCanReadContact(_ctx: ContactAccessContext, _contactId: string): Promise<void> {
		return;
	}
}

import { Injectable } from "@nestjs/common";
import { createId } from "#shared/lib/id";
import { BulkCommunication } from "../../../domain/entities/bulk-communication.entity";
import { BulkCommunicationRepository } from "../../../domain/repositories/bulk-communication.repository";
import type { AudienceType } from "../../../domain/value-objects/notification.vo";
import type { CreateBulkDto } from "../../dto/bulk-communication.dto";

@Injectable()
export class CreateBulkHandler {
	constructor(private readonly repo: BulkCommunicationRepository) {}

	async execute(organizationId: string, dto: CreateBulkDto, userId: string | null) {
		const now = new Date();
		const bulk = BulkCommunication.create({
			id: createId(),
			organizationId,
			name: dto.name,
			subject: dto.subject,
			bodyHtml: dto.bodyHtml,
			status: "draft",
			audienceType: dto.audienceType as AudienceType,
			audienceRef: dto.audienceRef ?? null,
			recipientCount: 0,
			scheduledAt: null,
			sentAt: null,
			createdBy: userId,
			stats: null,
			createdAt: now,
			updatedAt: now,
		});
		const saved = await this.repo.save(bulk);
		return saved.toPrimitives();
	}
}
